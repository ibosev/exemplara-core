import {
  CAPABILITY_IDS,
  createAllowAllCapabilityPolicy,
  createCapabilityPolicy,
  type CapabilityId,
} from "../core/capabilities.js";
import type { EditorExtension } from "./extensions.js";
import {
  adaptEditorExtension,
  composeEditor,
  type EditorComposition,
  type EditorPlugin,
  type EditorServiceMap,
} from "./composition.js";
import { createActionSurfacesPlugin } from "./plugins/action-surfaces.js";
import { createCoreCanvasPlugin } from "./plugins/core-canvas.js";
import { createCoreEditingPlugin } from "./plugins/core-editing.js";
import { createCoreInspectorPlugin } from "./plugins/core-inspector.js";
import { createCorePanelsPlugin } from "./plugins/core-panels.js";
import { createCoreToolbarPlugin } from "./plugins/core-toolbar.js";

export interface FullEditorPresetOptions {
  plugins?: readonly EditorPlugin[];
  /** Compatibility bridge for the original function-style extension API. */
  extensions?: readonly EditorExtension[];
  services?: EditorServiceMap;
}

/** Palette, outline, inspector, toolbar, canvas, and editing commands. */
const CORE_SHELL_PLUGINS = (): EditorPlugin[] => [
  createCorePanelsPlugin(),
  createCoreInspectorPlugin(),
  createCoreToolbarPlugin(),
  createCoreCanvasPlugin(),
  createCoreEditingPlugin(),
  createActionSurfacesPlugin(),
];

/** Structural editor. Feature plugins are supplied by the host. */
export function createFullEditorPreset(
  options: FullEditorPresetOptions = {},
): EditorComposition {
  const legacyPlugins = (options.extensions ?? []).map((extension, index) =>
    adaptEditorExtension(extension, `legacy.extension.${index + 1}`),
  );
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

const DATA_CAPABILITIES: readonly CapabilityId[] = [
  "data.sources.manage",
  "data.bind.author",
  "data.resolve",
];

export interface ManualEditorPresetOptions {
  plugins?: readonly EditorPlugin[];
  services?: EditorServiceMap;
}

export interface WebEditorPresetOptions {
  plugins?: readonly EditorPlugin[];
  services?: EditorServiceMap;
}

/** Shell preset. Website components and routes come from a host plugin. */
export function createWebEditorPreset(
  options: WebEditorPresetOptions = {},
): EditorComposition {
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
export function createManualEditorPreset(
  options: ManualEditorPresetOptions = {},
): EditorComposition {
  return composeEditor({
    policy: createCapabilityPolicy(
      CAPABILITY_IDS.filter(
        (capability) => !DATA_CAPABILITIES.includes(capability),
      ),
      { unsupportedDocument: "warn" },
    ),
    plugins: [...CORE_SHELL_PLUGINS(), ...(options.plugins ?? [])],
    services: options.services,
  });
}
