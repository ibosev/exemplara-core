import { type ReadableAtom } from 'nanostores';
import { type Command } from './commands.js';
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
 * Framework-independent command engine with snapshot undo/redo history.
 *
 * The engine intentionally has no UI-framework or DOM dependency.
 * UI packages can bridge `subscribe()` into their native reactive primitive
 * while sharing identical mutation, transaction, and history semantics.
 */
export declare class DocumentEngine {
    #private;
    readonly store: ReadableAtom<DocumentEngineState>;
    constructor(options?: DocumentEngineOptions);
    get doc(): ExemplaraDocument;
    get revision(): number;
    get canUndo(): boolean;
    get canRedo(): boolean;
    /** Plain, detached deep snapshot of the current document. */
    snapshot(): ExemplaraDocument;
    /** Observe the canonical Nano Store, optionally emitting its current value. */
    subscribe(listener: DocumentEngineListener, emitCurrent?: boolean): () => void;
    state(): DocumentEngineState;
    /** Execute a single command as one undoable step. */
    execute(command: Command): void;
    /** Execute several commands atomically as one undoable step. */
    batch(commands: Command[]): void;
    destroy(): void;
    undo(): boolean;
    redo(): boolean;
    /** Replace the document and clear history (for example after loading a file). */
    load(document: ExemplaraDocument): void;
}
