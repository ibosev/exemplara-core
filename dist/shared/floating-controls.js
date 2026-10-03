function clamp(value, min, max) {
    return Math.max(min, Math.min(value, max));
}
/**
 * Place selection controls in the visible paper gutter when possible.
 * A compact overflow button is used when the full toolbar cannot fit, so
 * dense or very small document nodes are never covered by their controls.
 */
export function placeFloatingControls(target, page, viewport, fullWidth, height, compactWidth = 28, gap = 8) {
    if (target.bottom < viewport.top
        || target.top > viewport.bottom
        || target.right < viewport.left
        || target.left > viewport.right) {
        return { mode: 'hidden', side: 'viewport', x: 0, y: 0 };
    }
    const y = clamp(target.top, viewport.top + gap, Math.max(viewport.top + gap, viewport.bottom - height - gap));
    const rightX = page.right + gap;
    const rightSpace = viewport.right - gap - rightX;
    if (rightSpace >= fullWidth)
        return { mode: 'full', side: 'right', x: rightX, y };
    const leftX = page.left - gap - fullWidth;
    const leftSpace = page.left - gap - (viewport.left + gap);
    if (leftSpace >= fullWidth)
        return { mode: 'full', side: 'left', x: leftX, y };
    if (rightSpace >= compactWidth) {
        return { mode: 'compact', side: 'right', x: rightX, y };
    }
    if (leftSpace >= compactWidth) {
        return {
            mode: 'compact',
            side: 'left',
            x: page.left - gap - compactWidth,
            y,
        };
    }
    // Narrow/horizontally scrolled canvas: keep one overflow button in the
    // canvas chrome rather than drawing a full toolbar over document content.
    return {
        mode: 'compact',
        side: 'viewport',
        x: Math.max(viewport.left + gap, viewport.right - compactWidth - gap),
        y: viewport.top + gap,
    };
}
