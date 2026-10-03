import { atom, computed, readonlyType } from 'nanostores';
import { applyCommand } from './commands.js';
import { createDocument } from './create.js';
/**
 * The document model is deliberately JSON-serializable. A JSON round-trip
 * also detaches framework proxies (for example Svelte $state) that cannot be
 * passed to structuredClone and must never become engine-owned state.
 */
function detachDocument(document) {
    return JSON.parse(JSON.stringify(document));
}
/**
 * Framework-independent command engine with snapshot undo/redo history.
 *
 * The engine intentionally has no UI-framework or DOM dependency.
 * UI packages can bridge `subscribe()` into their native reactive primitive
 * while sharing identical mutation, transaction, and history semantics.
 */
export class DocumentEngine {
    #historyLimit;
    #input;
    #disposed = atom(false);
    store;
    constructor(options = {}) {
        this.#historyLimit = Math.max(0, options.historyLimit ?? 100);
        this.#input = atom({
            document: detachDocument(options.document ?? createDocument()),
            revision: 0,
            undo: [],
            redo: [],
        });
        this.store = readonlyType(computed(this.#input, state => ({
            document: state.document,
            revision: state.revision,
            canUndo: state.undo.length > 0,
            canRedo: state.redo.length > 0,
        })));
    }
    get doc() { return this.#input.get().document; }
    get revision() { return this.#input.get().revision; }
    get canUndo() { return this.#input.get().undo.length > 0; }
    get canRedo() { return this.#input.get().redo.length > 0; }
    /** Plain, detached deep snapshot of the current document. */
    snapshot() { return structuredClone(this.doc); }
    /** Observe the canonical Nano Store, optionally emitting its current value. */
    subscribe(listener, emitCurrent = true) {
        const notify = (state) => listener(state);
        return emitCurrent ? this.store.subscribe(notify) : this.store.listen(notify);
    }
    state() { return this.store.get(); }
    #recordHistory(history, document) {
        return this.#historyLimit === 0 ? [] : [...history, document].slice(-this.#historyLimit);
    }
    #commit(run) {
        if (this.#disposed.get())
            return;
        const state = this.#input.get();
        const before = this.snapshot();
        const next = structuredClone(state.document);
        // Apply to a detached document; failures publish neither document nor history.
        run(next);
        this.#input.set({ document: next, revision: state.revision + 1,
            undo: this.#recordHistory(state.undo, before), redo: [] });
    }
    /** Execute a single command as one undoable step. */
    execute(command) { this.#commit(document => applyCommand(document, command)); }
    /** Execute several commands atomically as one undoable step. */
    batch(commands) {
        if (commands.length)
            this.#commit(document => {
                for (const command of commands)
                    applyCommand(document, command);
            });
    }
    destroy() { this.#disposed.set(true); }
    undo() {
        if (this.#disposed.get())
            return false;
        const state = this.#input.get(), previous = state.undo.at(-1);
        if (!previous)
            return false;
        this.#input.set({ document: previous, revision: state.revision + 1,
            undo: state.undo.slice(0, -1), redo: [...state.redo, this.snapshot()] });
        return true;
    }
    redo() {
        if (this.#disposed.get())
            return false;
        const state = this.#input.get(), next = state.redo.at(-1);
        if (!next)
            return false;
        this.#input.set({ document: next, revision: state.revision + 1,
            undo: this.#recordHistory(state.undo, this.snapshot()), redo: state.redo.slice(0, -1) });
        return true;
    }
    /** Replace the document and clear history (for example after loading a file). */
    load(document) {
        if (this.#disposed.get())
            return;
        this.#input.set({ document: detachDocument(document), revision: this.revision + 1, undo: [], redo: [] });
    }
}
