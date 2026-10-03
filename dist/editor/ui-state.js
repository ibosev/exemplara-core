import { atom, batch, readonlyType } from 'nanostores';
import { bindingAuthoringValue, commitBindingAuthoring } from '../shared/binding-authoring.js';
import { findNode } from '../core/tree.js';
import { attachedStyleRuleIds } from './style-targets.js';
import { resolveParagraphFormatting } from '../shared/ruler.js';
import { getPageDimensions } from '../core/presets.js';
import { resolveSectionTemplate } from '../core/print-sections.js';
import { createId } from '../core/id.js';
import { parseImportedSampleData } from '../shared/forms.js';
import { sanitizeHtml } from '../shared/richtext.js';
import { serialize } from '../core/serialization.js';
export const SIDEBAR_DEFAULT_WIDTHS = { left: 286, right: 344 };
export const SIDEBAR_MIN_WIDTHS = { left: 240, right: 280 };
export const SIDEBAR_MAX_WIDTH = 840;
export const MIN_CANVAS_WIDTH = 360;
/** Actual component and feature state, shared by every view of one session. */
function defaults(editor, scope, profile) {
    const node = scope && profile === 'richText' ? findNode(editor.doc, scope) : null;
    const printTarget = profile === 'printChrome' && scope ? JSON.parse(scope) : null;
    const formatting = resolveParagraphFormatting(editor.selectedNode);
    const page = editor.activePage;
    const contentWidth = page ? getPageDimensions(page.size, page.orientation).width - page.margins.left - page.margins.right : 170;
    return {
        ruler: { tabAlignment: 'left', draftLeft: formatting.leftIndent, draftFirst: formatting.leftIndent + formatting.firstLineIndent, draftRight: contentWidth - formatting.rightIndent, dragging: false },
        layers: { expansion: {} },
        property: { jsonError: '' },
        tableRows: { modeOverride: null },
        richText: {
            draftHtml: node ? (editor.isProvidedCapabilityEnabled('data.bind.author') ? bindingAuthoringValue(node) : String(node.props.content ?? '')) : '',
            autocomplete: null,
            highlightedIndex: 0,
            preferredSourceId: undefined,
        },
        printChrome: { draftHtml: printTarget ? resolveSectionTemplate(editor.doc, printTarget[0], printTarget[1]).html : '', committed: false },
        selectionToolbar: { placement: { mode: 'hidden', side: 'viewport', x: 0, y: 0 }, fullWidth: 0, measuredSignature: '' },
        shell: { sidebarWidths: { ...SIDEBAR_DEFAULT_WIDTHS }, resizingSide: null, resizeStartX: 0, resizeStartWidth: 0 },
        canvas: { reflowPending: false, scrollSyncPending: false, lastPrintFocus: -1 },
        preview: { withData: editor.isProvidedCapabilityEnabled('data.resolve'), sheetMode: true, showGuides: true, overflows: [] },
        assets: { uploading: false, pendingImports: 0, error: '' },
        expressions: { showRaw: false },
        design: { newColorName: '' },
        utils: { query: '', copied: null },
        blocks: { query: '', view: 'all', editingSymbolId: null, editingLabel: '', deletingSymbolId: null },
        data: { importError: '', expandedSourceId: null, dialogWasOpen: false, dragging: false, pasteOpen: false, pasteText: '', view: 'fields', query: '' },
        library: { query: '', source: 'all' },
        printSourceDraft: { position: editor.printPosition, pageIndex: editor.effectivePrintPreviewPage, variant: editor.printVariant, sourceTab: 'html', htmlDrafts: {}, originalHtml: {}, draftTargets: {}, cssDraft: editor.doc.print.css, originalCss: editor.doc.print.css, status: '' },
        dataStructure: { expandedOverride: null, adding: false, draftName: '', draftType: 'string', localError: '' },
        dataTree: { expandedOverride: null },
        elementStyle: { targetKey: 'inline', ruleState: 'base', mediaScope: 'all', customMediaQuery: '', newClassName: '', previousNodeId: null },
        printSource: { open: false },
        disclosures: { expanded: {} },
        versions: { entries: [], loading: false, previewLoadingId: null, snapshotLoading: false, restoring: false, error: '' },
        versionPersistence: { disposed: false, saving: false, epoch: editor.documentEpoch, listRequest: 0, previewRequest: 0, lastSaved: serialize(editor.snapshot()) },
    };
}
/** Nano Store with typed immutable writes and document/lifetime fencing. */
export class EditorUiModel {
    editor;
    initial;
    store;
    values;
    #input;
    #generation = atom(0);
    #requests = atom({});
    constructor(editor, initial) {
        this.editor = editor;
        this.initial = initial;
        this.#input = atom(initial());
        this.store = readonlyType(this.#input);
        this.values = Object.defineProperties({}, Object.fromEntries(Object.keys(this.#input.get()).map(key => [key, {
                enumerable: true,
                get: () => this.#input.get()[key],
                set: (value) => this.set(key, value),
            }])));
    }
    set(key, value) {
        if (this.editor.destroyed || Object.is(this.#input.get()[key], value))
            return;
        this.#input.set({ ...this.#input.get(), [key]: value });
    }
    patch(change) {
        if (this.editor.destroyed)
            return;
        const value = this.#input.get();
        if (Object.keys(change).every(key => Object.is(value[key], change[key])))
            return;
        this.#input.set({ ...value, ...change });
    }
    update(update) {
        if (!this.editor.destroyed)
            this.#input.set(update(this.#input.get()));
    }
    reset() {
        this.#generation.set(this.#generation.get() + 1);
        if (!this.editor.destroyed)
            this.#input.set(this.initial());
    }
    /** Capture before awaiting a platform/service operation. */
    capture() {
        const epoch = this.editor.documentEpoch, generation = this.#generation.get();
        return () => !this.editor.destroyed && this.editor.documentEpoch === epoch && this.#generation.get() === generation;
    }
    begin(channel) {
        const request = (this.#requests.get()[channel] ?? 0) + 1;
        this.#requests.set({ ...this.#requests.get(), [channel]: request });
        const current = this.capture();
        return () => current() && this.#requests.get()[channel] === request;
    }
}
export class EditorUiState {
    editor;
    #models = new Map();
    #stops = [];
    #timers = new Set();
    constructor(editor) {
        this.editor = editor;
    }
    get(profile, scope = '', initial) {
        const key = JSON.stringify([profile, scope]);
        let model = this.#models.get(key);
        if (!model) {
            let seed = initial;
            model = new EditorUiModel(this.editor, () => {
                const value = { ...defaults(this.editor, scope, profile)[profile], ...structuredClone(seed ?? {}) };
                seed = undefined;
                return value;
            });
            this.#models.set(key, model);
            if (profile === 'ruler') {
                const sync = () => {
                    const ruler = model;
                    if (ruler.store.get().dragging)
                        return;
                    const { draftLeft, draftFirst, draftRight } = defaults(this.editor, '', 'ruler').ruler;
                    ruler.patch({ draftLeft, draftFirst, draftRight });
                };
                this.#stops.push(this.editor.stores.selectedNode.listen(sync), this.editor.stores.activePage.listen(sync));
            }
            if (profile === 'elementStyle') {
                const style = model;
                const sync = () => {
                    const node = this.editor.selectedNode;
                    const value = style.store.get();
                    if (value.previousNodeId !== (node?.id ?? null))
                        style.patch({ previousNodeId: node?.id ?? null, targetKey: 'inline', ruleState: 'base', mediaScope: 'all', customMediaQuery: '' });
                    else if (value.targetKey.startsWith('class:') && (!node || !attachedStyleRuleIds(node).includes(value.targetKey.slice(6))))
                        style.set('targetKey', 'inline');
                };
                this.#stops.push(this.editor.stores.selectedNode.listen(sync));
                sync();
            }
        }
        return model;
    }
    reset() { batch(() => { for (const [key, model] of this.#models)
        if (JSON.parse(key)[0] !== 'versionPersistence')
            model.reset(); }); }
    detachView() {
        batch(() => {
            this.get('canvas').reset();
            this.get('selectionToolbar').reset();
            this.get('ruler').set('dragging', false);
            this.get('shell').set('resizingSide', null);
            this.get('data').set('dialogWasOpen', false);
        });
    }
    commitRichText(nodeId) {
        if (this.editor.destroyed)
            return;
        const node = findNode(this.editor.doc, nodeId);
        if (!node)
            return;
        const model = this.get('richText', nodeId), draft = model.store.get();
        const html = sanitizeHtml(draft.draftHtml);
        const authored = this.editor.isProvidedCapabilityEnabled('data.bind.author')
            ? commitBindingAuthoring(node, html, this.editor.doc.dataSources, draft.preferredSourceId)
            : { content: html, dataBindings: node.dataBindings?.filter(binding => binding.targetProp !== 'content') };
        batch(() => {
            if (authored.content !== String(node.props.content ?? '') || JSON.stringify(authored.dataBindings) !== JSON.stringify(node.dataBindings))
                this.editor.commitRichTextAuthoring(nodeId, authored.content, authored.dataBindings);
            this.editor.editingId = null;
            model.reset();
        });
    }
    cancelRichText(nodeId) {
        if (this.editor.destroyed)
            return;
        batch(() => { this.editor.editingId = null; this.get('richText', nodeId).reset(); });
    }
    async importAssets(files) {
        const model = this.get('assets'), current = model.capture();
        model.patch({ uploading: true, pendingImports: model.store.get().pendingImports + 1, error: '' });
        try {
            for (const file of files) {
                if (!current())
                    return;
                if (!file.type.startsWith('image/')) {
                    model.set('error', `Skipped ${file.name}: not an image`);
                    continue;
                }
                const image = await file.read();
                if (!current())
                    return;
                this.editor.engine.execute({ type: 'asset:add', payload: { asset: { id: createId('asset'), type: file.type === 'image/svg+xml' ? 'svg' : 'image', name: file.name, mimeType: file.type, ...image } } });
            }
        }
        catch (error) {
            if (current())
                model.set('error', error instanceof Error ? error.message : 'Image import failed');
        }
        finally {
            if (current()) {
                const pendingImports = model.store.get().pendingImports - 1;
                model.patch({ pendingImports, uploading: pendingImports > 0 });
            }
        }
    }
    importData(raw, label) {
        if (this.editor.destroyed)
            return false;
        const model = this.get('data'), parsed = parseImportedSampleData(raw);
        if (!parsed.ok) {
            model.set('importError', `${label}: ${parsed.error}`);
            return false;
        }
        batch(() => {
            const source = { id: createId('data'), name: label.replace(/\.json$/i, '') || (this.editor.doc.dataSources.length ? `Data ${this.editor.doc.dataSources.length + 1}` : 'Template data'), type: 'static', sampleData: parsed.value };
            this.editor.engine.execute({ type: 'data:add-source', payload: { source } });
            model.patch({ expandedSourceId: source.id, view: Object.keys(parsed.value).length ? 'fields' : 'structure', query: '', importError: '' });
            this.editor.setHostStatus(`Added ${Object.keys(parsed.value).length} top-level groups from ${label}`, 'success');
        });
        return true;
    }
    async readData(label, read) {
        const model = this.get('data'), current = model.capture();
        try {
            const raw = await read();
            return current() && this.importData(raw, label);
        }
        catch (error) {
            if (current())
                model.set('importError', error instanceof Error ? error.message : 'Data import failed');
            return false;
        }
    }
    async copyExample(name, copy) {
        const model = this.get('utils'), current = model.begin('copy');
        try {
            await copy();
            if (!current())
                return;
            model.set('copied', name);
            const timer = setTimeout(() => { this.#timers.delete(timer); if (current() && model.store.get().copied === name)
                model.set('copied', null); }, 1200);
            this.#timers.add(timer);
        }
        catch {
            if (current())
                model.set('copied', null);
        }
    }
    destroy() {
        this.#stops.splice(0).forEach(stop => stop());
        this.#timers.forEach(clearTimeout);
        this.#timers.clear();
        this.#models.clear();
    }
}
