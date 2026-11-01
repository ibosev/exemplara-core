import test from 'node:test';
import assert from 'node:assert/strict';
import { createDocument, validateDocument } from '../dist/core/index.js';
import { EditorSession, createFullEditorPreset } from '../dist/editor/index.js';
import { render } from '../dist/renderer/index.js';

test('a document without layout guides still validates and renders', () => {
  const doc = createDocument({ name: 'Plain' });
  assert.equal(validateDocument(doc).valid, true);
  assert.equal(doc.pages[0].guides, undefined);
  assert.equal(render(doc).fullHtml.includes('shx-layout-guide'), false);
});

test('layout guides survive on the page but never enter print HTML', () => {
  const doc = createDocument({ name: 'Guided' });
  doc.pages[0].guides = [{ id: 'shx-layout-guide', axis: 'horizontal', position: 40 }];
  const html = render(doc).fullHtml;
  assert.equal(html.includes('shx-layout-guide'), false);
  assert.equal(html.includes('layout-guide'), false);
  assert.equal(validateDocument(doc).valid, true);
});

test('invalid layout guides fail validation', () => {
  const doc = createDocument({ name: 'Broken guides' });
  doc.pages[0].guides = [{ id: 'g', axis: 'diagonal', position: Number.NaN }];
  const result = validateDocument(doc);
  assert.equal(result.valid, false);
  assert.ok(result.issues.some((issue) => issue.path.endsWith('.axis')));
  assert.ok(result.issues.some((issue) => issue.path.endsWith('.position')));
});

test('duplicating a page copies its layout guides', () => {
  const editor = new EditorSession({ composition: createFullEditorPreset() });
  const source = editor.doc.pages[0];
  editor.engine.execute({
    type: 'page:update',
    payload: {
      pageId: source.id,
      changes: { guides: [{ id: 'g1', axis: 'vertical', position: 18 }] },
    },
  });
  editor.duplicatePage(source.id);
  const copy = editor.doc.pages[1];
  assert.notEqual(copy.id, source.id);
  assert.deepEqual(copy.guides, [{ id: 'g1', axis: 'vertical', position: 18 }]);
  editor.undo();
  assert.equal(editor.doc.pages.length, 1);
  editor.undo();
  assert.equal(editor.doc.pages[0].guides, undefined);
});
