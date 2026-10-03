import { EditorUiState } from './ui-state.js';
import { createSessionStores, type DragPayload, type DropTarget } from "./stores.js";
import { DocumentEngine } from "../core/engine.js";
import { ComponentRegistry } from "../core/registry.js";
import { EditorExtensionRegistry, type EditorCommandContext, type EditorController, type EditorExtension, type EditorHostConfig, type EditorStatus } from "./extensions.js";
import { type EditorComposition } from "./composition.js";
import { type PageFlowMeasurement } from "../core/pagination.js";
import { type BindingAutocompleteTrigger } from "../shared/binding-authoring.js";
import type { EditorAutocompleteSuggestion } from "./extensions.js";
import { type CapabilityId, type UnsupportedDocumentCapability } from "../core/capabilities.js";
import { type SectionTemplatePosition } from "../core/print-sections.js";
import type { ComponentDefinition, ComponentNode, ExemplaraDocument, Page, ParagraphFormatting, PrintSection, PrintTemplateVariant, RegionName } from "../core/types.js";
import { type RenderRuntime } from "../renderer/runtime.js";
export interface EditorSessionOptions {
    document?: ExemplaraDocument;
    historyLimit?: number;
    registry?: ComponentRegistry;
    composition?: EditorComposition;
    /** @deprecated Prefer identified plugins in composition. */
    extensions?: readonly EditorExtension[];
    host?: EditorHostConfig;
}
export interface EditorViewAdapter {
    revealNode?: (nodeId: string) => void;
    viewportWidth?: () => number;
}
export type LeftTab = string;
export type RightTab = string;
export interface ContextMenuState {
    x: number;
    y: number;
    nodeId: string;
}
/** Framework-independent editor state and behavior; each instance owns its stores. */
export declare class EditorSession {
    #private;
    readonly engine: DocumentEngine;
    readonly registry: ComponentRegistry;
    readonly extensions: EditorExtensionRegistry;
    readonly composition: EditorComposition;
    readonly renderRuntime: RenderRuntime;
    readonly host: EditorHostConfig;
    readonly controller: EditorController;
    readonly stores: ReturnType<typeof createSessionStores>["stores"];
    readonly ui: EditorUiState;
    get destroyed(): boolean;
    get engineRevision(): number;
    get documentEpoch(): number;
    set documentEpoch(value: number);
    get registryRevision(): number;
    set registryRevision(value: number);
    get selectedId(): string | null;
    set selectedId(value: string | null);
    get hoveredId(): string | null;
    set hoveredId(value: string | null);
    get activePageIndex(): number;
    set activePageIndex(value: number);
    get clipboard(): ComponentNode | null;
    set clipboard(value: ComponentNode | null);
    get zoom(): number;
    set zoom(value: number);
    get editingId(): string | null;
    set editingId(value: string | null);
    get leftTab(): LeftTab;
    set leftTab(value: LeftTab);
    get rightTab(): RightTab;
    set rightTab(value: RightTab);
    get leftPanelCompact(): boolean;
    set leftPanelCompact(value: boolean);
    get rightPanelCompact(): boolean;
    set rightPanelCompact(value: boolean);
    get printPosition(): "header" | "footer";
    set printPosition(value: "header" | "footer");
    get printVariant(): PrintTemplateVariant;
    set printVariant(value: PrintTemplateVariant);
    get printPreviewPage(): number;
    set printPreviewPage(value: number);
    get printEditing(): boolean;
    set printEditing(value: boolean);
    get blockedFlowPageIds(): string[];
    set blockedFlowPageIds(value: string[]);
    get previewOpen(): boolean;
    set previewOpen(value: boolean);
    get dataWorkspaceOpen(): boolean;
    set dataWorkspaceOpen(value: boolean);
    get contextMenu(): ContextMenuState | null;
    set contextMenu(value: ContextMenuState | null);
    get layerRevealRevision(): number;
    set layerRevealRevision(value: number);
    get dark(): boolean;
    set dark(value: boolean);
    get dataPreviewEnabled(): boolean;
    set dataPreviewEnabled(value: boolean);
    get hostThemeRevision(): number;
    set hostThemeRevision(value: number);
    get historicalPreviewDocument(): ExemplaraDocument | null;
    set historicalPreviewDocument(value: ExemplaraDocument | null);
    get historicalPreviewVersionId(): string | null;
    set historicalPreviewVersionId(value: string | null);
    get hostStatus(): EditorStatus | null;
    set hostStatus(value: EditorStatus | null);
    get doc(): ExemplaraDocument;
    get canUndo(): boolean;
    get canRedo(): boolean;
    get historicalPreviewActive(): boolean;
    get isPrintTabActive(): boolean;
    get effectivePrintPreviewPage(): number;
    get activePage(): Page | null;
    get selectedNode(): ComponentNode | null;
    get selectedDefinition(): ComponentDefinition | null;
    get registryCategories(): Map<string, ComponentDefinition[]>;
    get capabilityDiagnostics(): UnsupportedDocumentCapability[];
    /** Register the currently attached view. Old detach callbacks never remove a newer view. */
    registerViewAdapter(view: EditorViewAdapter): () => void;
    snapshot(): ExemplaraDocument;
    setActivePage(index: number): void;
    setZoom(value: number): void;
    setDrag(active: DragPayload | null, over?: DropTarget | null): void;
    applyDragPayload(payload: DragPayload, target: DropTarget): void;
    constructor(init?: EditorSessionOptions);
    destroy(): void;
    getDefinition(type: string): ComponentDefinition | undefined;
    get expressionRuntime(): import("../shared/expression.js").TemplateExpressionRuntime;
    hasPlugin(pluginId: string): boolean;
    /** A feature is active only when policy permits it and an installed plugin provides it. */
    isProvidedCapabilityEnabled(capability: CapabilityId): boolean;
    autocompleteSuggestions(trigger: BindingAutocompleteTrigger): EditorAutocompleteSuggestion[];
    setHostStatus(message: string, tone?: EditorStatus["tone"]): void;
    /** Replace the whole document and reset editor-local selection/form state. */
    replaceDocument(document: ExemplaraDocument): void;
    /** Render a durable snapshot without loading it into the command engine or changing undo history. */
    previewHistoricalDocument(versionId: string, document: ExemplaraDocument): void;
    /** Return the canvas to the current editable draft. */
    clearHistoricalPreview(): void;
    isDarkChrome(): boolean;
    toggleChromeTheme(): void;
    openPanel(panelId: string, expand?: boolean): boolean;
    isPanelCompact(side: "left" | "right"): boolean;
    setPanelCompact(side: "left" | "right", compact: boolean): void;
    togglePanelCompact(side: "left" | "right"): void;
    openDataWorkspace(): boolean;
    closeDataWorkspace(): void;
    setAutoFlow(enabled: boolean): void;
    toggleAutoFlow(): void;
    canRunCommand(commandId: string, context?: EditorCommandContext): boolean;
    runCommand(commandId: string, context?: EditorCommandContext): Promise<boolean>;
    /** @deprecated Use canRunCommand(). */
    canRunExtensionCommand(commandId: string): boolean;
    /** @deprecated Use runCommand(). */
    runExtensionCommand(commandId: string): Promise<boolean>;
    saveToHost(): Promise<boolean>;
    select(nodeId: string | null): void;
    /** Select a component and bring its rendered canvas element into view. */
    selectAndRevealNode(nodeId: string): boolean;
    /** Select and reveal the nearest component parent. Region roots have no selectable parent. */
    selectParent(nodeId: string): boolean;
    /** Open Layers and request expansion/scrolling to a component node. */
    revealInLayers(nodeId: string): boolean;
    openContextMenu(x: number, y: number, nodeId: string): void;
    closeContextMenu(): void;
    setDataPreview(enabled: boolean): void;
    /** Merge every data source's sampleData into one preview context. */
    getDataContext(): Record<string, unknown>;
    addComponent(type: string, parentId: string, index?: number, slot?: string): ComponentNode;
    addBlock(blockId: string, parentId: string, index?: number, slot?: string): ComponentNode | null;
    /** Insert an image node backed by a document asset at an explicit drop target. */
    insertAssetImage(assetId: string, parentId: string, index?: number, slot?: string): ComponentNode | null;
    /** Replace the source of an existing native or imported HTML image with a document asset. */
    applyAssetToImage(assetId: string, nodeId: string): boolean;
    /** Register the currently mounted rich-text caret as an expression insertion target. */
    registerInlineExpressionTarget(nodeId: string, insert: (expression: string) => boolean): () => void;
    /** Insert at the active rich-text caret, or replace selected component content outside edit mode. */
    insertExpression(expression: string): boolean;
    moveNode(nodeId: string, targetParentId: string, targetIndex: number, targetSlot?: string): void;
    updateProps(nodeId: string, props: Record<string, unknown>): void;
    /** Commit rich-text content and its explicit binding metadata as one undo step. */
    commitRichTextAuthoring(nodeId: string, content: string, dataBindings: ComponentNode["dataBindings"]): void;
    /** Commit a text-like property and its binding metadata as one undo step. */
    commitPropAuthoring(nodeId: string, targetProp: string, value: unknown, dataBindings: ComponentNode["dataBindings"]): void;
    /** Update author-owned page-flow rules, collapsing a split logical node first. */
    updatePaginationRules(nodeId: string, changes: Partial<NonNullable<ComponentNode["pagination"]>>): void;
    /** Enter lossless rich-text editing for the complete logical flow node. */
    beginRichTextEdit(nodeId: string): void;
    /**
     * Set (or clear with undefined) a value-based style binding on a node.
     * Value bindings are rendered as inline styles by the renderer.
     */
    setStyleBinding(nodeId: string, property: string, value: string | undefined): void;
    /** Attach or detach a reusable document style class from a logical node. */
    setStyleRuleAttachment(nodeId: string, ruleId: string, attached: boolean): void;
    /** Create a reusable style class and attach it in the same undoable action. */
    createReusableStyleClass(nodeId: string, name: string): string | null;
    /** Read the current value-based style binding for a property. */
    getStyleBinding(nodeId: string, property: string): string | undefined;
    removeNode(nodeId: string): void;
    duplicateNode(nodeId: string): void;
    /** Move a node one position up/down among its siblings. */
    moveBy(nodeId: string, delta: 1 | -1): void;
    /** Snapshot a node as a reusable symbol and tag the node as its instance. */
    createSymbolFromNode(nodeId: string): void;
    /** Insert a fresh symbol instance into a drop target or the active page body. */
    insertSymbolInstance(symbolId: string, parentId?: string, index?: number, slot?: string): ComponentNode | null;
    detachSymbol(nodeId: string): void;
    renameSymbol(symbolId: string, label: string): void;
    /** Delete a saved definition while leaving placed instances as independent content. */
    removeSymbol(symbolId: string): void;
    copyNode(nodeId: string): void;
    /** Paste the clipboard node next to the selected node (or into the body). */
    pasteClipboard(): void;
    addPage(): void;
    duplicatePage(pageId?: string | undefined): void;
    ensureWebChrome(kind: "header" | "footer"): string;
    promoteSelectionToSiteChrome(kind: "header" | "footer"): boolean;
    removePage(pageId: string): void;
    /** Open the Print panel from a Word-like header/footer zone on a sheet. */
    openPrintChrome(position: SectionTemplatePosition, pageIndex: number, editing?: boolean): void;
    updatePrintVariantForPage(position: SectionTemplatePosition, pageIndex: number, variant: PrintTemplateVariant, value: string): void;
    startPrintSection(pageIndex: number): void;
    removePrintSectionBreak(pageIndex: number): void;
    setPrintSectionLinked(sectionId: string, position: SectionTemplatePosition, linkedToPrevious: boolean): void;
    updatePrintSection(sectionId: string, changes: Partial<Pick<PrintSection, "label" | "differentFirstPage" | "differentOddEven">>): void;
    updateParagraphFormatting(nodeId: string, changes: Partial<ParagraphFormatting>): void;
    /** Apply one measured auto-pagination step; returns true when the AST changed. */
    applyPageFlow(measurements: PageFlowMeasurement[]): boolean;
    /** Set (or clear with '') the page background color via the background region. */
    setPageBackground(pageId: string, color: string): void;
    /** Add or remove an optional page region (header/footer/background). */
    toggleRegion(pageId: string, name: Exclude<RegionName, "body">): void;
    /** Fit the active page width into the canvas viewport. */
    zoomToFit(viewportWidth?: number | undefined): void;
    undo(): void;
    redo(): void;
}
export declare function createEditorSession(options?: EditorSessionOptions): EditorSession;
export type { DragPayload, DropTarget } from "./stores.js";
