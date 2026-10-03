import test from 'node:test';
import assert from 'node:assert/strict';
import { DocumentEngine, ComponentRegistry, createDocument, createNode } from '../dist/core/index.js';
import { EditorSession, composeEditor, createFullEditorPreset, createCoreEditingPlugin } from '../dist/editor/index.js';
import { render } from '../dist/renderer/index.js';

function session(options = {}) { return new EditorSession({ composition: createFullEditorPreset(), ...options }); }

test('instances own document, history, selection, drag, runtime, and registry', () => {
  const a = session(), b = session();
  const root = a.doc.pages[0].regions.body.id;
  const node = a.addComponent('text', root);
  a.setZoom(1.5); a.setDrag({ kind: 'move', nodeId: node.id });
  a.renderRuntime.transforms.register('local', () => 'a');
  a.registry.register({ ...a.registry.get('text'), type: 'local' });
  assert.equal(a.selectedId, node.id); assert.equal(a.canUndo, true);
  assert.equal(b.selectedId, null); assert.equal(b.canUndo, false);
  assert.equal(b.zoom, 1); assert.equal(b.stores.drag.get().active, null);
  assert.equal(b.registry.get('local'), undefined);
  assert.equal(b.renderRuntime.transforms.get('local'), undefined);
  a.destroy(); b.destroy();
});

test('one editing action publishes a reconciled selection and one history entry', () => {
  const editor = session();
  const seen = [];
  const stop = editor.stores.engineState.listen(() => seen.push({ selected: editor.selectedId, node: editor.selectedNode?.id, revision: editor.engineRevision }));
  const node = editor.addComponent('text', editor.activePage.regions.body.id);
  assert.deepEqual(seen, [{ selected: node.id, node: node.id, revision: 1 }]);
  editor.undo(); assert.equal(editor.selectedId, null); assert.equal(editor.selectedNode, null);
  editor.redo(); assert.equal(editor.doc.pages[0].regions.body.children[0].id, node.id);
  stop(); editor.destroy();
});

test('historical preview preserves the draft and history and blocks dispatch/save', async () => {
  let saved = 0;
  const editor = session({ host: { onSave: () => { saved++; return true; } } });
  const node = editor.addComponent('text', editor.activePage.regions.body.id);
  const draft = editor.snapshot(), revision = editor.engineRevision;
  editor.previewHistoricalDocument('old', createDocument({ name: 'Old' }));
  assert.equal(editor.doc.name, 'Old'); assert.deepEqual(editor.snapshot(), draft);
  assert.equal(await editor.runCommand('node.delete', { nodeId: node.id }), false);
  assert.equal(await editor.saveToHost(), false); assert.equal(saved, 0);
  editor.clearHistoricalPreview(); assert.equal(editor.engineRevision, revision);
  assert.deepEqual(editor.doc, draft); editor.destroy();
});

test('replacement reconciles fields, clears drag and preserves renderer output', () => {
  const editor = session();
  const node = editor.addComponent('text', editor.activePage.regions.body.id);
  editor.setDrag({ kind: 'move', nodeId: node.id }); editor.editingId = node.id;
  const document = createDocument({ name: 'Replacement' });
  document.pages[0].regions.body.children.push(createNode('text', { content: 'Canonical HTML' }));
  editor.replaceDocument(document);
  assert.equal(editor.documentEpoch, 1); assert.equal(editor.selectedId, null);
  assert.equal(editor.editingId, null); assert.equal(editor.canUndo, false);
  assert.equal(editor.stores.drag.get().active, null);
  assert.deepEqual(render(editor.snapshot()), render(document));
  editor.destroy();
});

test('late host saves cannot overwrite replacement or disposed status', async () => {
  let finish;
  const editor = session({ host: { onSave: () => new Promise(resolve => { finish = resolve; }) } });
  const save = editor.saveToHost();
  editor.replaceDocument(createDocument({ name: 'B' })); editor.setHostStatus('B ready');
  finish(true); assert.equal(await save, false); assert.equal(editor.hostStatus.message, 'B ready');
  const next = editor.saveToHost(); editor.destroy(); finish(true);
  assert.equal(await next, false);
});

test('view detach does not dispose a session and old detach never removes a new adapter', () => {
  const editor = session();
  let first = 0, second = 0;
  const node = editor.addComponent('text', editor.activePage.regions.body.id);
  const oldDetach = editor.registerViewAdapter({ revealNode: () => first++ });
  const detach = editor.registerViewAdapter({ revealNode: () => second++ });
  oldDetach(); editor.selectAndRevealNode(node.id);
  assert.equal(first, 0); assert.equal(second, 1); assert.equal(editor.destroyed, false);
  detach(); editor.selectAndRevealNode(node.id); assert.equal(second, 1);
  editor.destroy();
});

test('session hooks start once, dispose in reverse order, and stop publication', () => {
  const events = [];
  const plugin = { id: 'test.lifecycle', version: '1', setup(api) {
    api.onSession(() => { events.push('start'); return () => events.push('stop'); });
    return () => events.push('setup-dispose');
  } };
  const editor = session({ composition: composeEditor({ plugins: [plugin] }) });
  editor.extensions.start(editor); assert.deepEqual(events, ['start']);
  const revision = editor.engineRevision;
  editor.destroy(); editor.destroy();
  assert.deepEqual(events, ['start', 'stop', 'setup-dispose']);
  editor.engine.load(createDocument()); assert.equal(editor.engineRevision, revision);
  assert.throws(() => editor.addPage(), /destroyed/);
});

test('failed setup disposes earlier registrations and failed lifecycle disposes all hooks', () => {
  const events = [];
  const good = { id: 'good', version: '1', setup() { return () => events.push('good'); } };
  assert.throws(() => session({ composition: composeEditor({ plugins: [good, { id: 'bad', version: '1', setup() { throw Error('setup failure'); } }] }) }), /setup failure/);
  assert.deepEqual(events, ['good']);
  const life = { id: 'life', version: '1', setup(api) { api.onSession(() => { throw Error('start failure'); }); } };
  assert.throws(() => session({ composition: composeEditor({ plugins: [good, life] }) }), /start failure/);
  assert.deepEqual(events, ['good', 'good']);
});

test('a failing disposer still cleans up other plugins and engine subscriptions', () => {
  const events = [];
  const plugin = { id: 'cleanup', version: '1', setup(api) {
    api.onSession(() => () => { events.push('hook'); throw Error('cleanup failure'); });
    return () => events.push('setup');
  } };
  const editor = session({ composition: composeEditor({ plugins: [plugin] }) });
  const revision = editor.engineRevision;
  assert.throws(() => editor.destroy(), AggregateError);
  assert.deepEqual(events, ['hook', 'setup']);
  editor.engine.load(createDocument()); assert.equal(editor.engineRevision, revision);
  editor.destroy();
});
