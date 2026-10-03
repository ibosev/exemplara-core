export interface RectEdges {
    top: number;
    right: number;
    bottom: number;
    left: number;
}
export interface FloatingControlsPlacement {
    mode: 'hidden' | 'full' | 'compact';
    side: 'right' | 'left' | 'viewport';
    x: number;
    y: number;
}
/**
 * Place selection controls in the visible paper gutter when possible.
 * A compact overflow button is used when the full toolbar cannot fit, so
 * dense or very small document nodes are never covered by their controls.
 */
export declare function placeFloatingControls(target: RectEdges, page: RectEdges, viewport: RectEdges, fullWidth: number, height: number, compactWidth?: number, gap?: number): FloatingControlsPlacement;
