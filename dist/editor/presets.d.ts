import type { EditorExtension } from "./extensions.js";
import { type EditorComposition, type EditorPlugin, type EditorServiceMap } from "./composition.js";
export interface FullEditorPresetOptions {
    plugins?: readonly EditorPlugin[];
    /** Compatibility bridge for the original function-style extension API. */
    extensions?: readonly EditorExtension[];
    services?: EditorServiceMap;
}
/** Structural editor. Feature plugins are supplied by the host. */
export declare function createFullEditorPreset(options?: FullEditorPresetOptions): EditorComposition;
export interface ManualEditorPresetOptions {
    plugins?: readonly EditorPlugin[];
    services?: EditorServiceMap;
}
export interface WebEditorPresetOptions {
    plugins?: readonly EditorPlugin[];
    services?: EditorServiceMap;
}
/** Shell preset. Website components and routes come from a host plugin. */
export declare function createWebEditorPreset(options?: WebEditorPresetOptions): EditorComposition;
/**
 * Shell preset whose policy disables `data.*`. A host that provides those
 * capabilities composes its own plugin on top.
 */
export declare function createManualEditorPreset(options?: ManualEditorPresetOptions): EditorComposition;
