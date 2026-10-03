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
export declare function resolveDropPosition(clientY: number, rect: RectLike, canNest: boolean, nestBand?: number): DropPosition;
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
export declare function dropTargetFor(position: DropPosition, input: SiblingDropInput): DropTarget;
