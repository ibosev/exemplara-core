export function createCorePanelsPlugin(options = {}) {
    return {
        id: "exemplara.core-panels",
        version: "1.0.0",
        setup(api) {
            api.addPanel({
                id: "components",
                label: "Atoms",
                placement: "left",
                order: 10,
                icon: "IconAtom",
            });
            api.addPanel({
                id: "layers",
                label: "Layers",
                placement: "left",
                order: 20,
                icon: "IconLayers",
            });
            api.addPanel({
                id: "inspect",
                label: "Selected",
                placement: "right",
                order: 10,
                icon: "IconInspect",
                activateOnSelection: true,
            });
        },
    };
}
