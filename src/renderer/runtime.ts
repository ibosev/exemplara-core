import {
  createBindingTransformRegistry,
  legacyBindingTransformRegistry,
  type BindingTransformRegistry,
} from './data.js';
import { registerBuiltinRenderers } from './components.js';
import {
  createRendererRegistry,
  legacyRendererRegistry,
  type RendererRegistry,
} from './registry.js';

export interface RenderRuntime {
  readonly renderers: RendererRegistry;
  readonly transforms: BindingTransformRegistry;
}

export interface CreateRenderRuntimeOptions {
  /** Copy registrations made through deprecated process-wide APIs. */
  inheritLegacy?: boolean;
}

let legacyBuiltinsRegistered = false;

function ensureLegacyBuiltins(): void {
  if (legacyBuiltinsRegistered) return;
  registerBuiltinRenderers(legacyRendererRegistry);
  legacyBuiltinsRegistered = true;
}

ensureLegacyBuiltins();

export function createRenderRuntime(
  options: CreateRenderRuntimeOptions = {},
): RenderRuntime {
  ensureLegacyBuiltins();
  if (options.inheritLegacy) {
    return {
      renderers: createRendererRegistry(legacyRendererRegistry.registrations()),
      transforms: createBindingTransformRegistry(legacyBindingTransformRegistry.entries()),
    };
  }
  const renderers = createRendererRegistry();
  registerBuiltinRenderers(renderers);
  return {
    renderers,
    transforms: createBindingTransformRegistry(),
  };
}

/** Process-wide compatibility runtime used only when no runtime is supplied. */
export function legacyRenderRuntime(): RenderRuntime {
  ensureLegacyBuiltins();
  return {
    renderers: legacyRendererRegistry,
    transforms: legacyBindingTransformRegistry,
  };
}
