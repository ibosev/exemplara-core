import { CAPABILITY_IDS, createAllowAllCapabilityPolicy, createCapabilityPolicy, } from "../core/capabilities.js";
import { adaptEditorExtension, composeEditor, } from "./composition.js";
import { createActionSurfacesPlugin } from "./plugins/action-surfaces.js";
import { createCoreCanvasPlugin } from "./plugins/core-canvas.js";
import { createCoreEditingPlugin } from "./plugins/core-editing.js";
import { createCoreInspectorPlugin } from "./plugins/core-inspector.js";
import { createCorePanelsPlugin } from "./plugins/core-panels.js";
import { createCoreToolbarPlugin } from "./plugins/core-toolbar.js";
/** Palette, outline, inspector, toolbar, canvas, and editing commands. */
const CORE_SHELL_PLUGINS = () => [
    createCorePanelsPlugin(),
    createCoreInspectorPlugin(),
    createCoreToolbarPlugin(),
    createCoreCanvasPlugin(),
    createCoreEditingPlugin(),
    createActionSurfacesPlugin(),
];
/** Structural editor. Feature plugins are supplied by the host. */
export function createFullEditorPreset(options = {}) {
    const legacyPlugins = (options.extensions ?? []).map((extension, index) => adaptEditorExtension(extension, `legacy.extension.${index + 1}`));
    return composeEditor({
        policy: createAllowAllCapabilityPolicy(),
        plugins: [
            ...CORE_SHELL_PLUGINS(),
            ...legacyPlugins,
            ...(options.plugins ?? []),
        ],
        services: options.services,
        inheritLegacyRegistrations: true,
    });
}
const DATA_CAPABILITIES = [
    "data.sources.manage",
    "data.bind.author",
    "data.resolve",
];
/** Shell preset. Website components and routes come from a host plugin. */
export function createWebEditorPreset(options = {}) {
    return composeEditor({
        policy: createAllowAllCapabilityPolicy(),
        plugins: [...CORE_SHELL_PLUGINS(), ...(options.plugins ?? [])],
        services: options.services,
    });
}
/**
 * Shell preset whose policy disables `data.*`. A host that provides those
 * capabilities composes its own plugin on top.
 */
export function createManualEditorPreset(options = {}) {
    return composeEditor({
        policy: createCapabilityPolicy(CAPABILITY_IDS.filter((capability) => !DATA_CAPABILITIES.includes(capability)), { unsupportedDocument: "warn" }),
        plugins: [...CORE_SHELL_PLUGINS(), ...(options.plugins ?? [])],
        services: options.services,
    });
}
