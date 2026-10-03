import { atom, computed, readonlyType } from "nanostores";
import { findNode } from "../core/tree.js";
import { findUnsupportedDocumentCapabilities } from "../core/capabilities.js";
import { isPluginCapabilityEnabled, } from "./composition.js";
export function createSessionStores(engine, registry, composition) {
    const engineState = engine.store;
    const destroyed = atom(false);
    const documentEpoch = atom(0);
    const registryRevision = atom(0);
    const selectedId = atom(null);
    const hoveredId = atom(null);
    const activePageIndex = atom(0);
    const clipboard = atom(null);
    const zoom = atom(1);
    const editingId = atom(null);
    const leftTab = atom("");
    const rightTab = atom("");
    const leftPanelCompact = atom(false);
    const rightPanelCompact = atom(false);
    const printPosition = atom("header");
    const printVariant = atom("default");
    const printPreviewPage = atom(0);
    const printEditing = atom(false);
    const blockedFlowPageIds = atom([]);
    const previewOpen = atom(false);
    const dataWorkspaceOpen = atom(false);
    const contextMenu = atom(null);
    const layerRevealRevision = atom(0);
    const dark = atom(false);
    const dataPreviewEnabled = atom(true);
    const hostThemeRevision = atom(0);
    const historicalPreviewDocument = atom(null);
    const historicalPreviewVersionId = atom(null);
    const hostStatus = atom(null);
    const drag = atom({
        active: null,
        over: null,
    });
    const doc = computed([engineState, historicalPreviewDocument], (state, historical) => historical ?? state.document);
    const canUndo = computed(engineState, (state) => state.canUndo);
    const canRedo = computed(engineState, (state) => state.canRedo);
    const historicalPreviewActive = computed(historicalPreviewDocument, (document) => document !== null);
    const isPrintTabActive = computed(rightTab, (tab) => tab === "print");
    const effectivePrintPreviewPage = computed([isPrintTabActive, activePageIndex, doc, printPreviewPage], (print, active, document, preview) => print
        ? Math.min(active, Math.max(0, document.pages.length - 1))
        : preview);
    const activePage = computed([doc, activePageIndex], (document, index) => document.pages[Math.min(index, document.pages.length - 1)] ?? null);
    const selectedNode = computed([doc, selectedId], (document, id) => id ? findNode(document, id) : null);
    const selectedDefinition = computed([selectedNode, registryRevision], (node) => (node ? (registry.get(node.type) ?? null) : null));
    const registryCategories = computed(registryRevision, () => registry.categories);
    const capabilityDiagnostics = computed(doc, (document) => {
        const policy = composition.policy;
        return findUnsupportedDocumentCapabilities(document, {
            enabled: policy.enabled,
            unsupportedDocument: policy.unsupportedDocument,
            allows: (capability) => capability === "data.resolve"
                ? isPluginCapabilityEnabled(composition, capability)
                : policy.allows(capability),
        });
    });
    return {
        inputs: {
            destroyed,
            engineState,
            documentEpoch,
            registryRevision,
            selectedId,
            hoveredId,
            activePageIndex,
            clipboard,
            zoom,
            editingId,
            leftTab,
            rightTab,
            leftPanelCompact,
            rightPanelCompact,
            printPosition,
            printVariant,
            printPreviewPage,
            printEditing,
            blockedFlowPageIds,
            previewOpen,
            dataWorkspaceOpen,
            contextMenu,
            layerRevealRevision,
            dark,
            dataPreviewEnabled,
            hostThemeRevision,
            historicalPreviewDocument,
            historicalPreviewVersionId,
            hostStatus,
            drag,
        },
        stores: {
            destroyed: readonlyType(destroyed),
            engineState: readonlyType(engineState),
            documentEpoch: readonlyType(documentEpoch),
            registryRevision: readonlyType(registryRevision),
            selectedId: readonlyType(selectedId),
            hoveredId: readonlyType(hoveredId),
            activePageIndex: readonlyType(activePageIndex),
            clipboard: readonlyType(clipboard),
            zoom: readonlyType(zoom),
            editingId: readonlyType(editingId),
            leftTab: readonlyType(leftTab),
            rightTab: readonlyType(rightTab),
            leftPanelCompact: readonlyType(leftPanelCompact),
            rightPanelCompact: readonlyType(rightPanelCompact),
            printPosition: readonlyType(printPosition),
            printVariant: readonlyType(printVariant),
            printPreviewPage: readonlyType(printPreviewPage),
            printEditing: readonlyType(printEditing),
            blockedFlowPageIds: readonlyType(blockedFlowPageIds),
            previewOpen: readonlyType(previewOpen),
            dataWorkspaceOpen: readonlyType(dataWorkspaceOpen),
            contextMenu: readonlyType(contextMenu),
            layerRevealRevision: readonlyType(layerRevealRevision),
            dark: readonlyType(dark),
            dataPreviewEnabled: readonlyType(dataPreviewEnabled),
            hostThemeRevision: readonlyType(hostThemeRevision),
            historicalPreviewDocument: readonlyType(historicalPreviewDocument),
            historicalPreviewVersionId: readonlyType(historicalPreviewVersionId),
            hostStatus: readonlyType(hostStatus),
            drag: readonlyType(drag),
            doc: readonlyType(doc),
            canUndo: readonlyType(canUndo),
            canRedo: readonlyType(canRedo),
            historicalPreviewActive: readonlyType(historicalPreviewActive),
            isPrintTabActive: readonlyType(isPrintTabActive),
            effectivePrintPreviewPage: readonlyType(effectivePrintPreviewPage),
            activePage: readonlyType(activePage),
            selectedNode: readonlyType(selectedNode),
            selectedDefinition: readonlyType(selectedDefinition),
            registryCategories: readonlyType(registryCategories),
            capabilityDiagnostics: readonlyType(capabilityDiagnostics),
        },
    };
}
