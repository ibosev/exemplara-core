import { registerCoreEditingMenus } from "./core-editing-surfaces.js";
/**
 * Optional node-action presentation for context, selection, Layers, and
 * Inspector surfaces. Command behavior and keyboard access stay in the
 * core-editing plugin.
 */
export function createActionSurfacesPlugin() {
    return {
        id: "exemplara.action-surfaces",
        version: "1.0.0",
        dependsOn: ["exemplara.core-editing"],
        provides: ["node.context-menu"],
        setup(api) {
            registerCoreEditingMenus(api);
            api.addCanvasDecoration({
                id: "selection-toolbar",
                placement: "overlay",
                order: 10,
            });
            api.addCanvasDecoration({
                id: "context-menu",
                placement: "overlay",
                order: 90,
            });
        },
    };
}
