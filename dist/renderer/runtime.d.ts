import { type BindingTransformRegistry } from './data.js';
import { type RendererRegistry } from './registry.js';
export interface RenderRuntime {
    readonly renderers: RendererRegistry;
    readonly transforms: BindingTransformRegistry;
}
export interface CreateRenderRuntimeOptions {
    /** Copy registrations made through deprecated process-wide APIs. */
    inheritLegacy?: boolean;
}
export declare function createRenderRuntime(options?: CreateRenderRuntimeOptions): RenderRuntime;
/** Process-wide compatibility runtime used only when no runtime is supplied. */
export declare function legacyRenderRuntime(): RenderRuntime;
