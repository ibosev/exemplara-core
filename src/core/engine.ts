import { atom, computed, readonlyType, type ReadableAtom } from 'nanostores';
import { applyCommand, type Command } from './commands.js';
import { createDocument } from './create.js';
import type { ExemplaraDocument } from './types.js';

export interface DocumentEngineOptions {
  document?: ExemplaraDocument;
  /** Maximum undo depth (default 100). */
  historyLimit?: number;
}

export interface DocumentEngineState {
  document: ExemplaraDocument;
  revision: number;
  canUndo: boolean;
  canRedo: boolean;
}

export type DocumentEngineListener = (state: DocumentEngineState) => void;

/**
 * The document model is deliberately JSON-serializable. A JSON round-trip
 * also detaches framework proxies (for example Svelte $state) that cannot be
 * passed to structuredClone and must never become engine-owned state.
 */
function detachDocument(document: ExemplaraDocument): ExemplaraDocument {
  return JSON.parse(JSON.stringify(document)) as ExemplaraDocument;
}

/**
 * Framework-independent command engine with snapshot undo/redo history.
 *
 * The engine intentionally has no UI-framework or DOM dependency.
 * UI packages can bridge `subscribe()` into their native reactive primitive
 * while sharing identical mutation, transaction, and history semantics.
 */
export class DocumentEngine {
  readonly #historyLimit: number;
  readonly #input;
  readonly #disposed = atom(false);
  readonly store: ReadableAtom<DocumentEngineState>;

  constructor(options: DocumentEngineOptions = {}) {
    this.#historyLimit = Math.max(0, options.historyLimit ?? 100);
    this.#input = atom({
      document: detachDocument(options.document ?? createDocument()),
      revision: 0,
      undo: [] as ExemplaraDocument[],
      redo: [] as ExemplaraDocument[],
    });
    this.store = readonlyType(computed(this.#input, state => ({
      document: state.document,
      revision: state.revision,
      canUndo: state.undo.length > 0,
      canRedo: state.redo.length > 0,
    })));
  }

  get doc(): ExemplaraDocument { return this.#input.get().document; }
  get revision(): number { return this.#input.get().revision; }
  get canUndo(): boolean { return this.#input.get().undo.length > 0; }
  get canRedo(): boolean { return this.#input.get().redo.length > 0; }

  /** Plain, detached deep snapshot of the current document. */
  snapshot(): ExemplaraDocument { return structuredClone(this.doc); }

  /** Observe the canonical Nano Store, optionally emitting its current value. */
  subscribe(listener: DocumentEngineListener, emitCurrent = true): () => void {
    const notify = (state: DocumentEngineState) => listener(state);
    return emitCurrent ? this.store.subscribe(notify) : this.store.listen(notify);
  }
  state(): DocumentEngineState { return this.store.get(); }

  #recordHistory(history: ExemplaraDocument[], document: ExemplaraDocument): ExemplaraDocument[] {
    return this.#historyLimit === 0 ? [] : [...history, document].slice(-this.#historyLimit);
  }

  #commit(run: (document: ExemplaraDocument) => void): void {
    if (this.#disposed.get()) return;
    const state = this.#input.get();
    const before = this.snapshot();
    const next = structuredClone(state.document);
    // Apply to a detached document; failures publish neither document nor history.
    run(next);
    this.#input.set({ document: next, revision: state.revision + 1,
      undo: this.#recordHistory(state.undo, before), redo: [] });
  }

  /** Execute a single command as one undoable step. */
  execute(command: Command): void { this.#commit(document => applyCommand(document, command)); }

  /** Execute several commands atomically as one undoable step. */
  batch(commands: Command[]): void {
    if (commands.length) this.#commit(document => {
      for (const command of commands) applyCommand(document, command);
    });
  }

  destroy(): void { this.#disposed.set(true); }

  undo(): boolean {
    if (this.#disposed.get()) return false;
    const state = this.#input.get(), previous = state.undo.at(-1);
    if (!previous) return false;
    this.#input.set({ document: previous, revision: state.revision + 1,
      undo: state.undo.slice(0, -1), redo: [...state.redo, this.snapshot()] });
    return true;
  }

  redo(): boolean {
    if (this.#disposed.get()) return false;
    const state = this.#input.get(), next = state.redo.at(-1);
    if (!next) return false;
    this.#input.set({ document: next, revision: state.revision + 1,
      undo: this.#recordHistory(state.undo, this.snapshot()), redo: state.redo.slice(0, -1) });
    return true;
  }

  /** Replace the document and clear history (for example after loading a file). */
  load(document: ExemplaraDocument): void {
    if (this.#disposed.get()) return;
    this.#input.set({ document: detachDocument(document), revision: this.revision + 1, undo: [], redo: [] });
  }
}
