export function createRendererRegistry(initial = []) {
    const renderers = new Map();
    const registry = {
        register(type, render, options = {}) {
            renderers.set(type, { render, managesChildren: options.managesChildren ?? false });
        },
        unregister: (type) => renderers.delete(type),
        get: (type) => renderers.get(type),
        registrations: () => [...renderers.entries()].map(([type, entry]) => ({
            type,
            render: entry.render,
            managesChildren: entry.managesChildren,
        })),
    };
    for (const entry of initial)
        registry.register(entry.type, entry.render, entry);
    return registry;
}
/** Mutable compatibility registry for the original process-wide API. */
export const legacyRendererRegistry = createRendererRegistry();
/** @deprecated Prefer an instance returned by `createRenderRuntime()`. */
export function registerRenderer(type, render, options = {}) {
    legacyRendererRegistry.register(type, render, options);
}
/** @deprecated Prefer an instance returned by `createRenderRuntime()`. */
export function unregisterRenderer(type) {
    return legacyRendererRegistry.unregister(type);
}
/** @deprecated Prefer an instance returned by `createRenderRuntime()`. */
export function getRenderer(type) {
    return legacyRendererRegistry.get(type);
}
