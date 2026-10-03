import type { EditorPlugin } from "../composition.js";
/**
 * Registers the structural editor panels — the component palette, the
 * document outline, and the Inspector. Feature panels (design, print, data,
 * assets, symbols, audit) come from their own plugins. Core panels use order
 * below DEFAULT_PANEL_ORDER (50) so extension panels follow them; the first
 * panel per side is also that side's initial tab.
 */
export interface CorePanelsPluginOptions {
    /** Keep reusable catalog blocks out of Atoms when the host exposes a dedicated Blocks panel. */
    includeBlocksInAdd?: boolean;
}
export declare function createCorePanelsPlugin(options?: CorePanelsPluginOptions): EditorPlugin;
