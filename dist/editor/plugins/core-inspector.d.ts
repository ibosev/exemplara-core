import type { EditorPlugin } from "../composition.js";
/**
 * Registers the standard Inspector sections as ordinary contributions.
 * Core sections use order below DEFAULT_PANEL_ORDER (50) so extension
 * sections follow them. The Inspector's chrome (title, node actions, prop
 * fields) stays fixed; sections render beneath it.
 */
export declare function createCoreInspectorPlugin(): EditorPlugin;
