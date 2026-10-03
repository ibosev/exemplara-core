import type { DocumentEngine } from "../core/engine.js";
import type { ComponentRegistry } from "../core/registry.js";
import { type EditorComposition } from "./composition.js";
import type { ComponentNode, ExemplaraDocument, PrintTemplateVariant } from "../core/types.js";
import type { ContextMenuState } from "./session.js";
import type { EditorStatus } from "./extension-types.js";
export declare function createSessionStores(engine: DocumentEngine, registry: ComponentRegistry, composition: EditorComposition): {
    inputs: {
        destroyed: import("nanostores").PreinitializedWritableAtom<boolean> & object;
        engineState: import("nanostores").ReadableAtom<import("../core/engine.js").DocumentEngineState>;
        documentEpoch: import("nanostores").PreinitializedWritableAtom<number> & object;
        registryRevision: import("nanostores").PreinitializedWritableAtom<number> & object;
        selectedId: import("nanostores").PreinitializedWritableAtom<string | null> & object;
        hoveredId: import("nanostores").PreinitializedWritableAtom<string | null> & object;
        activePageIndex: import("nanostores").PreinitializedWritableAtom<number> & object;
        clipboard: import("nanostores").PreinitializedWritableAtom<ComponentNode | null> & object;
        zoom: import("nanostores").PreinitializedWritableAtom<number> & object;
        editingId: import("nanostores").PreinitializedWritableAtom<string | null> & object;
        leftTab: import("nanostores").PreinitializedWritableAtom<string> & object;
        rightTab: import("nanostores").PreinitializedWritableAtom<string> & object;
        leftPanelCompact: import("nanostores").PreinitializedWritableAtom<boolean> & object;
        rightPanelCompact: import("nanostores").PreinitializedWritableAtom<boolean> & object;
        printPosition: import("nanostores").PreinitializedWritableAtom<"header" | "footer"> & object;
        printVariant: import("nanostores").PreinitializedWritableAtom<PrintTemplateVariant> & object;
        printPreviewPage: import("nanostores").PreinitializedWritableAtom<number> & object;
        printEditing: import("nanostores").PreinitializedWritableAtom<boolean> & object;
        blockedFlowPageIds: import("nanostores").PreinitializedWritableAtom<string[]> & object;
        previewOpen: import("nanostores").PreinitializedWritableAtom<boolean> & object;
        dataWorkspaceOpen: import("nanostores").PreinitializedWritableAtom<boolean> & object;
        contextMenu: import("nanostores").PreinitializedWritableAtom<ContextMenuState | null> & object;
        layerRevealRevision: import("nanostores").PreinitializedWritableAtom<number> & object;
        dark: import("nanostores").PreinitializedWritableAtom<boolean> & object;
        dataPreviewEnabled: import("nanostores").PreinitializedWritableAtom<boolean> & object;
        hostThemeRevision: import("nanostores").PreinitializedWritableAtom<number> & object;
        historicalPreviewDocument: import("nanostores").PreinitializedWritableAtom<ExemplaraDocument | null> & object;
        historicalPreviewVersionId: import("nanostores").PreinitializedWritableAtom<string | null> & object;
        hostStatus: import("nanostores").PreinitializedWritableAtom<EditorStatus | null> & object;
        drag: import("nanostores").PreinitializedWritableAtom<{
            active: DragPayload | null;
            over: DropTarget | null;
        }> & object;
    };
    stores: {
        destroyed: import("nanostores").ReadableAtom<boolean>;
        engineState: import("nanostores").ReadableAtom<import("../core/engine.js").DocumentEngineState>;
        documentEpoch: import("nanostores").ReadableAtom<number>;
        registryRevision: import("nanostores").ReadableAtom<number>;
        selectedId: import("nanostores").ReadableAtom<string | null>;
        hoveredId: import("nanostores").ReadableAtom<string | null>;
        activePageIndex: import("nanostores").ReadableAtom<number>;
        clipboard: import("nanostores").ReadableAtom<ComponentNode | null>;
        zoom: import("nanostores").ReadableAtom<number>;
        editingId: import("nanostores").ReadableAtom<string | null>;
        leftTab: import("nanostores").ReadableAtom<string>;
        rightTab: import("nanostores").ReadableAtom<string>;
        leftPanelCompact: import("nanostores").ReadableAtom<boolean>;
        rightPanelCompact: import("nanostores").ReadableAtom<boolean>;
        printPosition: import("nanostores").ReadableAtom<"header" | "footer">;
        printVariant: import("nanostores").ReadableAtom<PrintTemplateVariant>;
        printPreviewPage: import("nanostores").ReadableAtom<number>;
        printEditing: import("nanostores").ReadableAtom<boolean>;
        blockedFlowPageIds: import("nanostores").ReadableAtom<string[]>;
        previewOpen: import("nanostores").ReadableAtom<boolean>;
        dataWorkspaceOpen: import("nanostores").ReadableAtom<boolean>;
        contextMenu: import("nanostores").ReadableAtom<ContextMenuState | null>;
        layerRevealRevision: import("nanostores").ReadableAtom<number>;
        dark: import("nanostores").ReadableAtom<boolean>;
        dataPreviewEnabled: import("nanostores").ReadableAtom<boolean>;
        hostThemeRevision: import("nanostores").ReadableAtom<number>;
        historicalPreviewDocument: import("nanostores").ReadableAtom<ExemplaraDocument | null>;
        historicalPreviewVersionId: import("nanostores").ReadableAtom<string | null>;
        hostStatus: import("nanostores").ReadableAtom<EditorStatus | null>;
        drag: import("nanostores").ReadableAtom<{
            active: DragPayload | null;
            over: DropTarget | null;
        }>;
        doc: import("nanostores").ReadableAtom<ExemplaraDocument>;
        canUndo: import("nanostores").ReadableAtom<boolean>;
        canRedo: import("nanostores").ReadableAtom<boolean>;
        historicalPreviewActive: import("nanostores").ReadableAtom<boolean>;
        isPrintTabActive: import("nanostores").ReadableAtom<boolean>;
        effectivePrintPreviewPage: import("nanostores").ReadableAtom<number>;
        activePage: import("nanostores").ReadableAtom<import("../core/types.js").Page | null>;
        selectedNode: import("nanostores").ReadableAtom<ComponentNode | null>;
        selectedDefinition: import("nanostores").ReadableAtom<import("../core/types.js").ComponentDefinition | null>;
        registryCategories: import("nanostores").ReadableAtom<Map<string, import("../core/types.js").ComponentDefinition[]>>;
        capabilityDiagnostics: import("nanostores").ReadableAtom<import("../core/capabilities.js").UnsupportedDocumentCapability[]>;
    };
};
export type DragPayload = {
    kind: "new";
    componentType: string;
} | {
    kind: "block";
    blockId: string;
} | {
    kind: "asset";
    assetId: string;
} | {
    kind: "symbol";
    symbolId: string;
} | {
    kind: "move";
    nodeId: string;
};
import type { DropTarget } from "../shared/drop.js";
export type { DropTarget };
