import test from 'node:test';
import assert from 'node:assert/strict';
import { DocumentEngine, createDocument } from '../dist/core/index.js';
import { EditorApplication, EditorSession, createFullEditorPreset } from '../dist/editor/index.js';
const session = () => new EditorSession({ composition: createFullEditorPreset() });
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };

test('canonical engine store owns atomic document and history and session shares it', () => {
  const editor = session(), engine = editor.engine, seen = [];
  assert.equal(editor.stores.engineState, engine.store);
  const stop = engine.store.listen(state => seen.push([state.revision, state.document.name, state.canUndo, state.canRedo]));
  engine.execute({ type: 'document:update', payload: { changes: { name: 'Changed' } } });
  engine.undo(); engine.redo();
  assert.deepEqual(seen.map(state => state[0]), [1, 2, 3]);
  assert.deepEqual(seen.map(state => state.slice(2)), [[true, false], [false, true], [true, false]]);
  const before = engine.state();
  assert.throws(() => engine.batch([{ type: 'document:update', payload: { changes: { name: 'Uncommitted' } } }, { type: 'bad-command', payload: {} }]));
  assert.equal(engine.state(), before);
  editor.destroy(); engine.load(createDocument()); assert.equal(engine.state(), before); stop();
});

test('all component profiles are core stores, scoped per editor/node/path, and retain drafts across detach', () => {
  const a = session(), b = session();
  const node = a.addComponent('text', a.activePage.regions.body.id);
  const rich = a.ui.get('richText', node.id);
  rich.set('draftHtml', 'Uncommitted');
  const data = a.ui.get('data'); data.patch({ query: 'Invoice', pasteText: '{"draft":true}', pasteOpen: true });
  a.ui.get('shell').set('sidebarWidths', { left: 350, right: 390 });
  a.ui.get('disclosures').set('expanded', { paragraph: false });
  a.ui.get('dataStructure', 'source-a:path').set('draftName', 'First');
  assert.equal(a.ui.get('dataStructure', 'source-b:path').store.get().draftName, '');
  assert.equal(b.ui.get('data').store.get().query, '');
  const detach = a.registerViewAdapter({}); detach();
  assert.equal(a.ui.get('richText', node.id), rich);
  assert.equal(rich.store.get().draftHtml, 'Uncommitted');
  assert.equal(data.store.get().query, 'Invoice');
  assert.equal(a.ui.get('shell').store.get().sidebarWidths.left, 350);
  assert.equal(a.ui.get('disclosures').store.get().expanded.paragraph, false);
  a.ui.commitRichText(node.id);
  assert.equal(a.selectedNode.props.content, 'Uncommitted');
  assert.equal(rich.store.get().draftHtml, 'Uncommitted');
  rich.set('draftHtml', 'Cancelled'); a.ui.cancelRichText(node.id);
  assert.equal(rich.store.get().draftHtml, 'Uncommitted');
  a.replaceDocument(createDocument());
  assert.equal(data.store.get().query, ''); assert.equal(rich.store.get().draftHtml, '');
  a.destroy(); b.destroy();
});

test('replacement and destruction fence pending uploads, JSON reads and clipboard completions', async () => {
  const editor = session(), image = deferred(), json = deferred(), copy = deferred();
  const assets = editor.ui.get('assets'), data = editor.ui.get('data'), utils = editor.ui.get('utils');
  const uploading = editor.ui.importAssets([{ name: 'old.png', type: 'image/png', read: () => image.promise }]);
  const reading = editor.ui.readData('old.json', () => json.promise);
  const copying = editor.ui.copyExample('old', () => copy.promise);
  editor.replaceDocument(createDocument({ name: 'Replacement' }));
  image.resolve({ src: 'data:image/png;base64,AA' }); json.resolve('{"stale":true}'); copy.resolve();
  await Promise.all([uploading, reading, copying]);
  assert.equal(editor.doc.assets.length, 0); assert.equal(editor.doc.dataSources.length, 0);
  assert.equal(assets.store.get().uploading, false); assert.equal(data.store.get().importError, ''); assert.equal(utils.store.get().copied, null);
  const late = deferred(); const readingLate = editor.ui.readData('late.json', () => late.promise);
  editor.destroy(); const previous = data.store.get(); late.resolve('{"late":true}');
  assert.equal(await readingLate, false); assert.equal(data.store.get(), previous);
});

test('clipboard latest intent wins and data import is owned without a mounted view', async () => {
  const editor = session(), first = deferred(), second = deferred();
  const a = editor.ui.copyExample('first', () => first.promise), b = editor.ui.copyExample('second', () => second.promise);
  second.resolve(); await b; first.resolve(); await a;
  assert.equal(editor.ui.get('utils').store.get().copied, 'second');
  assert.equal(editor.ui.importData('broken', 'Bad'), false);
  assert.notEqual(editor.ui.get('data').store.get().importError, '');
  assert.equal(editor.ui.importData('{"invoice":{"amount":42}}', 'invoice.json'), true);
  assert.equal(editor.doc.dataSources[0].sampleData.invoice.amount, 42);
  assert.equal(editor.ui.get('data').store.get().expandedSourceId, editor.doc.dataSources[0].id);
  editor.destroy();
});

test('whole application stores own view/settings/features and live document without a Svelte view', () => {
  const options = {
    features: { print: true, web: false }, document: createDocument({ name: 'First' }),
    createComposition: () => createFullEditorPreset(), documentForFeatures: () => createDocument({ name: 'Replacement' }),
    exclusiveFeatures: [['print', 'web']],
  };
  const app = new EditorApplication(options), other = new EditorApplication(options);
  app.setView('json'); app.setSettingsOpen(true);
  const first = app.stores.session.get();
  first.engine.execute({ type: 'document:update', payload: { changes: { name: 'Headless edit' } } });
  assert.equal(app.stores.document.get(), first.engine.doc);
  assert.ok(app.stores.json.get().includes('Headless edit'));
  assert.equal(other.stores.view.get(), 'editor');
  app.setFeature('web', true);
  assert.deepEqual(app.stores.features.get(), { print: false, web: true });
  assert.equal(first.destroyed, true); assert.equal(app.stores.document.get().name, 'Replacement');
  assert.equal(app.stores.view.get(), 'json'); assert.equal(app.stores.settingsOpen.get(), true);
  app.destroy(); assert.equal(app.stores.destroyed.get(), true);
  app.setView('editor'); assert.equal(app.stores.view.get(), 'json');
  other.destroy();
});

test('failed application composition keeps the previous session and document intact', () => {
  const app = new EditorApplication({
    features: { fail: false }, document: createDocument({ name: 'Kept' }),
    createComposition: flags => { if (flags.fail) throw Error('Invalid composition'); return createFullEditorPreset(); },
    documentForFeatures: () => createDocument(),
  });
  const original = app.stores.session.get();
  assert.throws(() => app.setFeature('fail', true), /Invalid composition/);
  assert.equal(app.stores.session.get(), original); assert.equal(original.destroyed, false);
  assert.equal(app.stores.document.get().name, 'Kept'); assert.equal(app.stores.features.get().fail, false);
  app.destroy();
});
