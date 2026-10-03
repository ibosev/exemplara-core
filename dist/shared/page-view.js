/** Find the sheet nearest a vertical reading line in a scroll viewport. */
export function activePageAtY(pageRects, focusY, fallbackIndex = 0) {
    let nearestIndex = Math.max(0, Math.min(fallbackIndex, pageRects.length - 1));
    let nearestDistance = Number.POSITIVE_INFINITY;
    pageRects.forEach((rect, index) => {
        const distance = focusY < rect.top
            ? rect.top - focusY
            : focusY > rect.bottom
                ? focusY - rect.bottom
                : 0;
        if (distance < nearestDistance) {
            nearestDistance = distance;
            nearestIndex = index;
        }
    });
    return nearestIndex;
}
/** Standard reading line used by the Word-like canvas. */
export function viewportReadingY(viewport, ratio = 1 / 3) {
    return viewport.top + (viewport.bottom - viewport.top) * ratio;
}
export function pageScrollTop(pageOffsetTop, margin = 18) {
    return Math.max(0, pageOffsetTop - margin);
}
