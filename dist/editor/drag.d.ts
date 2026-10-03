import type { DragPayload, DropTarget } from "./stores.js";
export type { DragPayload, DropTarget } from "./stores.js";
/** Compatibility drag controllers can use the same state shape as editor sessions. */
export declare function createDragStore(): import("nanostores").PreinitializedWritableAtom<{
    active: DragPayload | null;
    over: DropTarget | null;
}> & object;
