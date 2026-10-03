import { atom } from "nanostores";
/** Compatibility drag controllers can use the same state shape as editor sessions. */
export function createDragStore() {
    return atom({
        active: null,
        over: null,
    });
}
