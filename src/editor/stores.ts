import { atom, computed, readonlyType } from "nanostores";
import type { DocumentEngine } from "../core/engine.js";
import type { ComponentRegistry } from "../core/registry.js";
import { findNode } from "../core/tree.js";
import { findUnsupportedDocumentCapabilities } from "../core/capabilities.js";
import {
  isPluginCapabilityEnabled,
  type EditorComposition,
} from "./composition.js";
import type {
  ComponentNode,
  ExemplaraDocument,
  PrintTemplateVariant,
} from "../core/types.js";
import type { ContextMenuState, LeftTab, RightTab } from "./session.js";
import type { EditorStatus } from "./extension-types.js";

export function createSessionStores(
  engine: DocumentEngine,
  registry: ComponentRegistry,
  composition: EditorComposition,
) {
  const engineState = engine.store;
  const destroyed = atom(false);
  const documentEpoch = atom<number>(0);
  const registryRevision = atom<number>(0);
  const selectedId = atom<string | null>(null);
  const hoveredId = atom<string | null>(null);
  const activePageIndex = atom<number>(0);
  const clipboard = atom<ComponentNode | null>(null);
  const zoom = atom<number>(1);
  const editingId = atom<string | null>(null);
  const leftTab = atom<LeftTab>("");
  const rightTab = atom<RightTab>("");
  const leftPanelCompact = atom<boolean>(false);
  const rightPanelCompact = atom<boolean>(false);
  const printPosition = atom<"header" | "footer">("header");
  const printVariant = atom<PrintTemplateVariant>("default");
  const printPreviewPage = atom<number>(0);
  const printEditing = atom<boolean>(false);
  const blockedFlowPageIds = atom<string[]>([]);
  const previewOpen = atom<boolean>(false);
  const dataWorkspaceOpen = atom<boolean>(false);
  const contextMenu = atom<ContextMenuState | null>(null);
  const layerRevealRevision = atom<number>(0);
  const dark = atom<boolean>(false);
  const dataPreviewEnabled = atom<boolean>(true);
  const hostThemeRevision = atom<number>(0);
  const historicalPreviewDocument = atom<ExemplaraDocument | null>(null);
  const historicalPreviewVersionId = atom<string | null>(null);
  const hostStatus = atom<EditorStatus | null>(null);
  const drag = atom<{ active: DragPayload | null; over: DropTarget | null }>({
    active: null,
    over: null,
  });
  const doc = computed(
    [engineState, historicalPreviewDocument],
    (state, historical) => historical ?? state.document,
  );
  const canUndo = computed(engineState, (state) => state.canUndo);
  const canRedo = computed(engineState, (state) => state.canRedo);
  const historicalPreviewActive = computed(
    historicalPreviewDocument,
    (document) => document !== null,
  );
  const isPrintTabActive = computed(rightTab, (tab) => tab === "print");
  const effectivePrintPreviewPage = computed(
    [isPrintTabActive, activePageIndex, doc, printPreviewPage],
    (print, active, document, preview) =>
      print
        ? Math.min(active, Math.max(0, document.pages.length - 1))
        : preview,
  );
  const activePage = computed(
    [doc, activePageIndex],
    (document, index) =>
      document.pages[Math.min(index, document.pages.length - 1)] ?? null,
  );
  const selectedNode = computed([doc, selectedId], (document, id) =>
    id ? findNode(document, id) : null,
  );
  const selectedDefinition = computed(
    [selectedNode, registryRevision],
    (node) => (node ? (registry.get(node.type) ?? null) : null),
  );
  const registryCategories = computed(
    registryRevision,
    () => registry.categories,
  );
  const capabilityDiagnostics = computed(doc, (document) => {
    const policy = composition.policy;
    return findUnsupportedDocumentCapabilities(document, {
      enabled: policy.enabled,
      unsupportedDocument: policy.unsupportedDocument,
      allows: (capability) =>
        capability === "data.resolve"
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

export type DragPayload =
  | { kind: "new"; componentType: string }
  | { kind: "block"; blockId: string }
  | { kind: "asset"; assetId: string }
  | { kind: "symbol"; symbolId: string }
  | { kind: "move"; nodeId: string };
import type { DropTarget } from "../shared/drop.js";
export type { DropTarget };
