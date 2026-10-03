export interface VerticalRect {
    top: number;
    bottom: number;
}
/** Find the sheet nearest a vertical reading line in a scroll viewport. */
export declare function activePageAtY(pageRects: readonly VerticalRect[], focusY: number, fallbackIndex?: number): number;
/** Standard reading line used by the Word-like canvas. */
export declare function viewportReadingY(viewport: VerticalRect, ratio?: number): number;
export declare function pageScrollTop(pageOffsetTop: number, margin?: number): number;
