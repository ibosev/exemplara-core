/** Trigger a client-side file download. */
export declare function downloadFile(filename: string, content: string | Blob, mime?: string): void;
/** Read a File (e.g. from an <input type="file">) as a data: URL. */
export declare function readFileAsDataURL(file: File): Promise<string>;
/** Measure the natural dimensions of an image source. */
export declare function getImageSize(src: string): Promise<{
    width: number;
    height: number;
}>;
/** True when the event target is a text-editing element (inputs, contenteditable). */
export declare function isEditableTarget(target: EventTarget | null): boolean;
/** Walk up from an element to find a `data-node-id` (canvas hit-testing). */
export declare function closestNodeId(element: Element | null): string | null;
/**
 * Keep a floating element (context menu, popover) inside the viewport.
 * Returns adjusted coordinates for a box of the given size at (x, y).
 */
export declare function clampToViewport(x: number, y: number, width: number, height: number, margin?: number): {
    x: number;
    y: number;
};
