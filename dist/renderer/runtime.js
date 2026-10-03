import { createBindingTransformRegistry, legacyBindingTransformRegistry, } from './data.js';
import { registerBuiltinRenderers } from './components.js';
import { createRendererRegistry, legacyRendererRegistry, } from './registry.js';
let legacyBuiltinsRegistered = false;
function ensureLegacyBuiltins() {
    if (legacyBuiltinsRegistered)
        return;
    registerBuiltinRenderers(legacyRendererRegistry);
    legacyBuiltinsRegistered = true;
}
ensureLegacyBuiltins();
export function createRenderRuntime(options = {}) {
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
export function legacyRenderRuntime() {
    ensureLegacyBuiltins();
    return {
        renderers: legacyRendererRegistry,
        transforms: legacyBindingTransformRegistry,
    };
}
