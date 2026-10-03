import { createAllowAllCapabilityPolicy, } from "../core/capabilities.js";
export class EditorCompositionError extends Error {
    code;
    pluginId;
    constructor(code, message, pluginId) {
        super(message);
        this.code = code;
        this.pluginId = pluginId;
        this.name = "EditorCompositionError";
    }
}
export function defineEditorPlugin(plugin) {
    return plugin;
}
/** True when policy permits a capability and an installed plugin supplies it. */
export function isPluginCapabilityEnabled(composition, capability) {
    return (composition.policy.allows(capability) &&
        composition.plugins.some((plugin) => plugin.provides?.includes(capability)));
}
export function adaptEditorExtension(extension, id) {
    return {
        id,
        version: "1.0.0",
        setup: extension,
    };
}
function validatePlugin(plugin) {
    if (!plugin.id.trim() ||
        !plugin.version.trim() ||
        typeof plugin.setup !== "function") {
        throw new EditorCompositionError("invalid-plugin", "Editor plugins require a non-empty id, version, and setup function.", plugin.id);
    }
}
function orderPlugins(plugins) {
    const byId = new Map();
    for (const plugin of plugins) {
        validatePlugin(plugin);
        if (byId.has(plugin.id)) {
            throw new EditorCompositionError("duplicate-plugin", `Duplicate editor plugin id: ${plugin.id}`, plugin.id);
        }
        byId.set(plugin.id, plugin);
    }
    for (const plugin of plugins) {
        for (const dependency of plugin.dependsOn ?? []) {
            if (!byId.has(dependency)) {
                throw new EditorCompositionError("missing-dependency", `Editor plugin ${plugin.id} depends on missing plugin ${dependency}.`, plugin.id);
            }
        }
    }
    const ordered = [];
    const visiting = new Set();
    const visited = new Set();
    const visit = (plugin) => {
        if (visited.has(plugin.id))
            return;
        if (visiting.has(plugin.id)) {
            throw new EditorCompositionError("dependency-cycle", `Editor plugin dependency cycle includes ${plugin.id}.`, plugin.id);
        }
        visiting.add(plugin.id);
        for (const dependency of plugin.dependsOn ?? [])
            visit(byId.get(dependency));
        visiting.delete(plugin.id);
        visited.add(plugin.id);
        ordered.push(plugin);
    };
    plugins.forEach(visit);
    return ordered;
}
export function composeEditor(options = {}) {
    const policy = options.policy ?? createAllowAllCapabilityPolicy();
    const plugins = orderPlugins(options.plugins ?? []);
    for (const plugin of plugins) {
        for (const capability of [
            ...(plugin.requires ?? []),
            ...(plugin.provides ?? []),
        ]) {
            if (!policy.allows(capability)) {
                throw new EditorCompositionError("disabled-capability", `Editor plugin ${plugin.id} requires disabled capability ${capability}.`, plugin.id);
            }
        }
    }
    return Object.freeze({
        plugins: Object.freeze(plugins),
        policy,
        services: Object.freeze({ ...(options.services ?? {}) }),
        inheritLegacyRegistrations: options.inheritLegacyRegistrations ?? false,
    });
}
