// ============================================
// Framework-agnostic drag & drop geometry.
// The Svelte editor wires these into attachments. Any other host can
// reuse the same math for identical drop behavior.
// ============================================
/**
 * Decide where a pointer at `clientY` over an element should drop:
 * before/after the element, or (for containers) inside it when the
 * pointer is within the central `nestBand` fraction of its height.
 */
export function resolveDropPosition(clientY, rect, canNest, nestBand = 0.4) {
    const ratio = (clientY - rect.top) / Math.max(rect.height, 1);
    if (canNest) {
        const edge = (1 - nestBand) / 2;
        if (ratio > edge && ratio < 1 - edge)
            return 'inside';
    }
    return ratio < 0.5 ? 'before' : 'after';
}
/** Translate a DropPosition over a node into a concrete insertion target. */
export function dropTargetFor(position, input) {
    switch (position) {
        case 'inside':
            return { parentId: input.nodeId, index: input.childCount };
        case 'before':
            return { parentId: input.parentId, index: input.index, slot: input.slot };
        case 'after':
            return { parentId: input.parentId, index: input.index + 1, slot: input.slot };
    }
}
