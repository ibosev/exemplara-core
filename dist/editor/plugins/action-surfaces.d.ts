import type { EditorPlugin } from "../composition.js";
/**
 * Optional node-action presentation for context, selection, Layers, and
 * Inspector surfaces. Command behavior and keyboard access stay in the
 * core-editing plugin.
 */
export declare function createActionSurfacesPlugin(): EditorPlugin;
