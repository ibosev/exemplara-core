// ============================================
// Framework-agnostic drag & drop geometry.
// The Svelte editor wires these into attachments. Any other host can
// reuse the same math for identical drop behavior.
// ============================================

export type DropPosition = 'before' | 'after' | 'inside';

export interface RectLike {
  top: number;
  height: number;
}

/**
 * Decide where a pointer at `clientY` over an element should drop:
 * before/after the element, or (for containers) inside it when the
 * pointer is within the central `nestBand` fraction of its height.
 */
export function resolveDropPosition(
  clientY: number,
  rect: RectLike,
  canNest: boolean,
  nestBand = 0.4,
): DropPosition {
  const ratio = (clientY - rect.top) / Math.max(rect.height, 1);
  if (canNest) {
    const edge = (1 - nestBand) / 2;
    if (ratio > edge && ratio < 1 - edge) return 'inside';
  }
  return ratio < 0.5 ? 'before' : 'after';
}

export interface SiblingDropInput {
  /** Parent (region or node) that owns the hovered node's sibling array. */
  parentId: string;
  /** Index of the hovered node among its siblings. */
  index: number;
  slot?: string;
  /** The hovered node itself (used for 'inside'). */
  nodeId: string;
  /** Current child count of the hovered node (insertion point for 'inside'). */
  childCount: number;
}

export interface DropTarget {
  parentId: string;
  index: number;
  slot?: string;
}

/** Translate a DropPosition over a node into a concrete insertion target. */
export function dropTargetFor(position: DropPosition, input: SiblingDropInput): DropTarget {
  switch (position) {
    case 'inside':
      return { parentId: input.nodeId, index: input.childCount };
    case 'before':
      return { parentId: input.parentId, index: input.index, slot: input.slot };
    case 'after':
      return { parentId: input.parentId, index: input.index + 1, slot: input.slot };
  }
}
