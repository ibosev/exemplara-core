import { atom } from "nanostores";
import type { DragPayload, DropTarget } from "./stores.js";
export type { DragPayload, DropTarget } from "./stores.js";
/** Compatibility drag controllers can use the same state shape as editor sessions. */
export function createDragStore() {
  return atom<{ active: DragPayload | null; over: DropTarget | null }>({
    active: null,
    over: null,
  });
}
