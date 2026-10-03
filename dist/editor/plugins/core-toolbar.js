/**
 * Registers the standard toolbar as ordinary cluster contributions. Core
 * clusters use orders 10–40 and 60–80; extension clusters default to 50 and
 * therefore land between the command buttons and the zoom controls. Every
 * cluster is enabled by default, while an embedding product can remove
 * duplicate application chrome without relying on CSS selectors.
 */
export function createCoreToolbarPlugin(options = {}) {
    return {
        id: "exemplara.core-toolbar",
        version: "1.0.0",
        setup(api) {
            if (options.brand !== false) {
                api.addToolbarCluster({ id: "brand", order: 10, zone: "start" });
            }
            if (options.history !== false) {
                api.addToolbarCluster({
                    id: "history",
                    order: 20,
                    zone: "start",
                    separator: "divider",
                });
            }
            if (options.status !== false) {
                api.addToolbarCluster({
                    id: "host-status",
                    order: 30,
                    zone: "start",
                    separator: "divider",
                });
            }
            if (options.commands !== false) {
                api.addToolbarCluster({
                    id: "commands",
                    order: 40,
                    zone: options.commandsZone ?? "start",
                });
            }
            if (options.zoom !== false) {
                api.addToolbarCluster({ id: "zoom", order: 60, zone: "center" });
            }
            if (options.theme !== false) {
                api.addToolbarCluster({ id: "theme", order: 70, zone: "end" });
            }
            if (options.actions !== false) {
                api.addToolbarCluster({
                    id: "actions",
                    order: 80,
                    zone: "end",
                    separator: "divider",
                });
            }
        },
    };
}
