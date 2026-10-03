import { batch } from "nanostores";
import { EditorUiState } from './ui-state.js';
import { createSessionStores, } from "./stores.js";
import { DocumentEngine } from "../core/engine.js";
import { ComponentRegistry, defaultRegistry } from "../core/registry.js";
import { EditorExtensionRegistry, } from "./extensions.js";
import { adaptEditorExtension, composeEditor, isPluginCapabilityEnabled, } from "./composition.js";
import { cloneNodeDeep, clonePageDeep, createPage, createRegion, } from "../core/create.js";
import { createId } from "../core/id.js";
import { getPageDimensions } from "../core/presets.js";
import { findNode, findParentNode, locateNode } from "../core/tree.js";
import { planCollapseFlowGroup, planPageFlow, } from "../core/pagination.js";
import { fitZoom, mmToPx } from "../shared/math.js";
import { isImageElementNode, mergeSampleData, nodeDisplayLabel, } from "../shared/editor.js";
import { normalizeParagraphFormatting } from "../shared/ruler.js";
import {} from "../shared/binding-authoring.js";
import { findUnsupportedDocumentCapabilities, } from "../core/capabilities.js";
import { resolveSectionTemplate, } from "../core/print-sections.js";
import { DEFAULT_WEB_DOCUMENT_SETTINGS, createWebPage, isWebDocument, uniqueWebSlug, webPageLabelFromSlug, } from "../core/web.js";
import { planRemovePrintSectionBreak, planSetPrintSectionLinked, planStartPrintSection, planUpdatePrintSection, planUpdatePrintVariant, } from "../core/print-section-commands.js";
import { createRenderRuntime, } from "../renderer/runtime.js";
import { createReusableStyleRule, setStyleRuleAttachment as updateStyleRuleAttachment, } from "./style-targets.js";
/** Framework-independent editor state and behavior; each instance owns its stores. */
export class EditorSession {
    engine;
    registry;
    extensions;
    composition;
    renderRuntime;
    host;
    controller;
    stores;
    ui;
    #state;
    #stopEngine = () => { };
    #stopRegistry = () => { };
    #inlineExpressionTarget = null;
    #view = null;
    get destroyed() {
        return this.#state.inputs.destroyed.get();
    }
    get engineRevision() {
        return this.stores.engineState.get().revision;
    }
    get documentEpoch() {
        return this.#state.inputs.documentEpoch.get();
    }
    set documentEpoch(value) {
        this.#mutate(() => this.#state.inputs.documentEpoch.set(value));
    }
    get registryRevision() {
        return this.#state.inputs.registryRevision.get();
    }
    set registryRevision(value) {
        this.#mutate(() => this.#state.inputs.registryRevision.set(value));
    }
    get selectedId() {
        return this.#state.inputs.selectedId.get();
    }
    set selectedId(value) {
        this.#mutate(() => this.#state.inputs.selectedId.set(value));
    }
    get hoveredId() {
        return this.#state.inputs.hoveredId.get();
    }
    set hoveredId(value) {
        this.#mutate(() => this.#state.inputs.hoveredId.set(value));
    }
    get activePageIndex() {
        return this.#state.inputs.activePageIndex.get();
    }
    set activePageIndex(value) {
        this.#mutate(() => this.#state.inputs.activePageIndex.set(value));
    }
    get clipboard() {
        return this.#state.inputs.clipboard.get();
    }
    set clipboard(value) {
        this.#mutate(() => this.#state.inputs.clipboard.set(value));
    }
    get zoom() {
        return this.#state.inputs.zoom.get();
    }
    set zoom(value) {
        this.#mutate(() => this.#state.inputs.zoom.set(value));
    }
    get editingId() {
        return this.#state.inputs.editingId.get();
    }
    set editingId(value) {
        this.#mutate(() => this.#state.inputs.editingId.set(value));
    }
    get leftTab() {
        return this.#state.inputs.leftTab.get();
    }
    set leftTab(value) {
        this.#mutate(() => this.#state.inputs.leftTab.set(value));
    }
    get rightTab() {
        return this.#state.inputs.rightTab.get();
    }
    set rightTab(value) {
        this.#mutate(() => this.#state.inputs.rightTab.set(value));
    }
    get leftPanelCompact() {
        return this.#state.inputs.leftPanelCompact.get();
    }
    set leftPanelCompact(value) {
        this.#mutate(() => this.#state.inputs.leftPanelCompact.set(value));
    }
    get rightPanelCompact() {
        return this.#state.inputs.rightPanelCompact.get();
    }
    set rightPanelCompact(value) {
        this.#mutate(() => this.#state.inputs.rightPanelCompact.set(value));
    }
    get printPosition() {
        return this.#state.inputs.printPosition.get();
    }
    set printPosition(value) {
        this.#mutate(() => this.#state.inputs.printPosition.set(value));
    }
    get printVariant() {
        return this.#state.inputs.printVariant.get();
    }
    set printVariant(value) {
        this.#mutate(() => this.#state.inputs.printVariant.set(value));
    }
    get printPreviewPage() {
        return this.#state.inputs.printPreviewPage.get();
    }
    set printPreviewPage(value) {
        this.#mutate(() => this.#state.inputs.printPreviewPage.set(value));
    }
    get printEditing() {
        return this.#state.inputs.printEditing.get();
    }
    set printEditing(value) {
        this.#mutate(() => this.#state.inputs.printEditing.set(value));
    }
    get blockedFlowPageIds() {
        return this.#state.inputs.blockedFlowPageIds.get();
    }
    set blockedFlowPageIds(value) {
        this.#mutate(() => this.#state.inputs.blockedFlowPageIds.set(value));
    }
    get previewOpen() {
        return this.#state.inputs.previewOpen.get();
    }
    set previewOpen(value) {
        this.#mutate(() => this.#state.inputs.previewOpen.set(value));
    }
    get dataWorkspaceOpen() {
        return this.#state.inputs.dataWorkspaceOpen.get();
    }
    set dataWorkspaceOpen(value) {
        this.#mutate(() => this.#state.inputs.dataWorkspaceOpen.set(value));
    }
    get contextMenu() {
        return this.#state.inputs.contextMenu.get();
    }
    set contextMenu(value) {
        this.#mutate(() => this.#state.inputs.contextMenu.set(value));
    }
    get layerRevealRevision() {
        return this.#state.inputs.layerRevealRevision.get();
    }
    set layerRevealRevision(value) {
        this.#mutate(() => this.#state.inputs.layerRevealRevision.set(value));
    }
    get dark() {
        return this.#state.inputs.dark.get();
    }
    set dark(value) {
        this.#mutate(() => this.#state.inputs.dark.set(value));
    }
    get dataPreviewEnabled() {
        return this.#state.inputs.dataPreviewEnabled.get();
    }
    set dataPreviewEnabled(value) {
        this.#mutate(() => this.#state.inputs.dataPreviewEnabled.set(value));
    }
    get hostThemeRevision() {
        return this.#state.inputs.hostThemeRevision.get();
    }
    set hostThemeRevision(value) {
        this.#mutate(() => this.#state.inputs.hostThemeRevision.set(value));
    }
    get historicalPreviewDocument() {
        return this.#state.inputs.historicalPreviewDocument.get();
    }
    set historicalPreviewDocument(value) {
        this.#mutate(() => this.#state.inputs.historicalPreviewDocument.set(value));
    }
    get historicalPreviewVersionId() {
        return this.#state.inputs.historicalPreviewVersionId.get();
    }
    set historicalPreviewVersionId(value) {
        this.#mutate(() => this.#state.inputs.historicalPreviewVersionId.set(value));
    }
    get hostStatus() {
        return this.#state.inputs.hostStatus.get();
    }
    set hostStatus(value) {
        this.#mutate(() => this.#state.inputs.hostStatus.set(value));
    }
    get doc() {
        return this.stores.doc.get();
    }
    get canUndo() {
        return this.stores.canUndo.get();
    }
    get canRedo() {
        return this.stores.canRedo.get();
    }
    get historicalPreviewActive() {
        return this.stores.historicalPreviewActive.get();
    }
    get isPrintTabActive() {
        return this.stores.isPrintTabActive.get();
    }
    get effectivePrintPreviewPage() {
        return this.stores.effectivePrintPreviewPage.get();
    }
    get activePage() {
        return this.stores.activePage.get();
    }
    get selectedNode() {
        return this.stores.selectedNode.get();
    }
    get selectedDefinition() {
        return this.stores.selectedDefinition.get();
    }
    get registryCategories() {
        return this.stores.registryCategories.get();
    }
    get capabilityDiagnostics() {
        return this.stores.capabilityDiagnostics.get();
    }
    /** Register the currently attached view. Old detach callbacks never remove a newer view. */
    registerViewAdapter(view) {
        if (this.destroyed)
            throw new Error("Editor session has been destroyed.");
        this.#view = view;
        return () => {
            if (this.#view === view) {
                this.#view = null;
                this.ui.detachView();
            }
        };
    }
    snapshot() {
        return this.engine.snapshot();
    }
    setActivePage(index) {
        return this.#mutate(() => {
            if (Number.isFinite(index))
                this.activePageIndex = Math.max(0, Math.min(Math.trunc(index), this.doc.pages.length - 1));
        });
    }
    setZoom(value) {
        return this.#mutate(() => {
            if (Number.isFinite(value) && value > 0)
                this.zoom = value;
        });
    }
    setDrag(active, over = null) {
        return this.#mutate(() => {
            this.#state.inputs.drag.set({ active, over });
        });
    }
    applyDragPayload(payload, target) {
        return this.#mutate(() => {
            switch (payload.kind) {
                case "new":
                    this.addComponent(payload.componentType, target.parentId, target.index, target.slot);
                    break;
                case "block":
                    this.addBlock(payload.blockId, target.parentId, target.index, target.slot);
                    break;
                case "asset":
                    this.insertAssetImage(payload.assetId, target.parentId, target.index, target.slot);
                    break;
                case "symbol":
                    this.insertSymbolInstance(payload.symbolId, target.parentId, target.index, target.slot);
                    break;
                case "move":
                    this.moveNode(payload.nodeId, target.parentId, target.index, target.slot);
                    break;
            }
        });
    }
    #mutate(run) {
        if (this.destroyed)
            throw new Error("Editor session has been destroyed.");
        let result;
        batch(() => {
            result = run();
        });
        return result;
    }
    constructor(init = {}) {
        this.engine = new DocumentEngine({
            document: init.document,
            historyLimit: init.historyLimit,
        });
        // Avoid leaking extension registrations between independent editor instances.
        this.registry = init.registry ?? new ComponentRegistry(defaultRegistry.all);
        // The full-featured default lives in Editor.svelte (presets.ts is the
        // only module that may import every plugin); a bare context is empty.
        const baseComposition = init.composition ?? composeEditor();
        this.composition = init.extensions?.length
            ? composeEditor({
                policy: baseComposition.policy,
                plugins: [
                    ...baseComposition.plugins,
                    ...init.extensions.map((extension, index) => adaptEditorExtension(extension, `legacy.context-extension.${index + 1}`)),
                ],
                services: baseComposition.services,
                inheritLegacyRegistrations: baseComposition.inheritLegacyRegistrations,
            })
            : baseComposition;
        this.renderRuntime = createRenderRuntime({
            inheritLegacy: this.composition.inheritLegacyRegistrations,
        });
        this.host = init.host ?? {};
        this.#state = createSessionStores(this.engine, this.registry, this.composition);
        this.stores = this.#state.stores;
        this.ui = new EditorUiState(this);
        this.extensions = new EditorExtensionRegistry(this.registry, this.composition.plugins.map((plugin) => plugin.setup), {
            policy: this.composition.policy,
            services: this.composition.services,
            renderRuntime: this.renderRuntime,
        });
        this.leftTab = this.extensions.panelsFor("left")[0]?.id ?? "";
        this.rightTab = this.extensions.panelsFor("right")[0]?.id ?? "";
        const editor = this;
        this.controller = {
            get document() {
                return editor.doc;
            },
            get selectedNodeId() {
                return editor.selectedId;
            },
            get activePageId() {
                return editor.activePage?.id ?? null;
            },
            get dataPreviewEnabled() {
                return editor.dataPreviewEnabled;
            },
            get dataWorkspaceOpen() {
                return editor.dataWorkspaceOpen;
            },
            get autoFlowEnabled() {
                return editor.doc.pagination.mode === "auto";
            },
            get renderRuntime() {
                return editor.renderRuntime;
            },
            get expressionRuntime() {
                return editor.expressionRuntime;
            },
            snapshot: () => editor.engine.snapshot(),
            replaceDocument: (document) => editor.replaceDocument(document),
            selectNode: (nodeId) => editor.select(nodeId),
            openPanel: (panelId) => editor.openPanel(panelId),
            isPanelCompact: (side) => editor.isPanelCompact(side),
            setPanelCompact: (side, compact) => editor.setPanelCompact(side, compact),
            togglePanelCompact: (side) => editor.togglePanelCompact(side),
            openDataWorkspace: () => editor.openDataWorkspace(),
            closeDataWorkspace: () => editor.closeDataWorkspace(),
            runCommand: (commandId) => editor.runCommand(commandId),
            insertExpression: (expression) => editor.insertExpression(expression),
            setDataPreview: (enabled) => editor.setDataPreview(enabled),
            setAutoFlow: (enabled) => editor.setAutoFlow(enabled),
            toggleAutoFlow: () => editor.toggleAutoFlow(),
            setStatus: (message, tone) => editor.setHostStatus(message, tone),
        };
        this.#stopEngine = this.engine.subscribe(() => batch(() => {
            this.#reconcileSelection();
        }));
        this.#stopRegistry = this.registry.subscribe((revision) => (this.registryRevision = revision));
        try {
            this.extensions.start(this);
        }
        catch (error) {
            this.destroy();
            throw error;
        }
    }
    destroy() {
        if (this.destroyed)
            return;
        this.#state.inputs.destroyed.set(true);
        this.#inlineExpressionTarget = null;
        this.#view = null;
        try {
            this.extensions.destroy();
        }
        finally {
            this.engine.destroy();
            this.#stopEngine();
            this.#stopRegistry();
            this.ui.destroy();
        }
    }
    getDefinition(type) {
        this.registryRevision;
        return this.registry.get(type);
    }
    get expressionRuntime() {
        return this.extensions.expressionRuntime;
    }
    hasPlugin(pluginId) {
        return this.composition.plugins.some((plugin) => plugin.id === pluginId);
    }
    /** A feature is active only when policy permits it and an installed plugin provides it. */
    isProvidedCapabilityEnabled(capability) {
        return isPluginCapabilityEnabled(this.composition, capability);
    }
    autocompleteSuggestions(trigger) {
        if (!this.isProvidedCapabilityEnabled("data.bind.author"))
            return [];
        const query = trigger.query.trim().toLowerCase();
        const formatterRank = (name, label, description) => {
            if (!query)
                return 0;
            const normalizedName = name.toLowerCase();
            const normalizedLabel = label.toLowerCase();
            if (normalizedName === query)
                return 0;
            if (normalizedName.startsWith(query))
                return 1;
            if (normalizedLabel.startsWith(query))
                return 2;
            if (normalizedName.includes(query))
                return 3;
            if (normalizedLabel.includes(query))
                return 4;
            return description.toLowerCase().includes(query) ? 5 : 6;
        };
        const base = trigger.kind === "path"
            ? []
            : this.extensions.formatters
                .filter((formatter) => formatter.usage !== "call")
                .filter((formatter) => !query ||
                formatter.name.toLowerCase().includes(query) ||
                formatter.label.toLowerCase().includes(query) ||
                formatter.description.toLowerCase().includes(query))
                .sort((a, b) => formatterRank(a.name, a.label, a.description) -
                formatterRank(b.name, b.label, b.description))
                .map((formatter) => ({
                id: `formatter:${formatter.name}`,
                value: /\|\s*([^}]+)\}\}/.exec(formatter.example)?.[1]?.trim() ??
                    formatter.name,
                label: formatter.name,
                kind: "formatter",
                type: "formatter",
                sourceName: formatter.category,
                preview: formatter.example,
                description: formatter.description,
            }));
        const provided = this.extensions.autocompleteProviders.flatMap((provider) => provider.suggest({ trigger, document: this.doc, query: trigger.query }));
        const unique = new Map();
        for (const suggestion of [...base, ...provided])
            unique.set(suggestion.id, suggestion);
        return [...unique.values()].slice(0, 12);
    }
    setHostStatus(message, tone = "neutral") {
        return this.#mutate(() => {
            this.hostStatus = { message, tone };
        });
    }
    /** Replace the whole document and reset editor-local selection/form state. */
    replaceDocument(document) {
        return this.#mutate(() => {
            this.clearHistoricalPreview();
            this.selectedId = null;
            this.editingId = null;
            this.#inlineExpressionTarget = null;
            this.contextMenu = null;
            this.setDrag(null);
            this.dataWorkspaceOpen = false;
            this.activePageIndex = Math.min(this.activePageIndex, Math.max(0, document.pages.length - 1));
            this.engine.load(document);
            this.documentEpoch += 1;
            this.ui.reset();
        });
    }
    /** Render a durable snapshot without loading it into the command engine or changing undo history. */
    previewHistoricalDocument(versionId, document) {
        return this.#mutate(() => {
            this.selectedId = null;
            this.hoveredId = null;
            this.editingId = null;
            this.#inlineExpressionTarget = null;
            this.contextMenu = null;
            this.printEditing = false;
            this.historicalPreviewVersionId = versionId;
            this.historicalPreviewDocument = document;
            this.activePageIndex = Math.min(this.activePageIndex, Math.max(0, document.pages.length - 1));
        });
    }
    /** Return the canvas to the current editable draft. */
    clearHistoricalPreview() {
        return this.#mutate(() => {
            if (!this.historicalPreviewDocument)
                return;
            this.historicalPreviewDocument = null;
            this.historicalPreviewVersionId = null;
            this.activePageIndex = Math.min(this.activePageIndex, Math.max(0, this.engine.doc.pages.length - 1));
        });
    }
    isDarkChrome() {
        this.hostThemeRevision;
        return this.host.theme ? this.host.theme.current() === "dark" : this.dark;
    }
    toggleChromeTheme() {
        return this.#mutate(() => {
            if (this.host.theme) {
                this.host.theme.toggle();
                this.hostThemeRevision += 1;
            }
            else {
                this.dark = !this.dark;
            }
        });
    }
    openPanel(panelId, expand = true) {
        return this.#mutate(() => {
            const panel = this.extensions.panel(panelId);
            if (panel?.placement === "left") {
                this.leftTab = panel.id;
                if (expand)
                    this.leftPanelCompact = false;
            }
            else if (panel?.placement === "right") {
                this.rightTab = panel.id;
                if (expand)
                    this.rightPanelCompact = false;
            }
            else
                return false;
            return true;
        });
    }
    isPanelCompact(side) {
        return side === "left" ? this.leftPanelCompact : this.rightPanelCompact;
    }
    setPanelCompact(side, compact) {
        return this.#mutate(() => {
            if (side === "left")
                this.leftPanelCompact = compact;
            else
                this.rightPanelCompact = compact;
        });
    }
    togglePanelCompact(side) {
        return this.#mutate(() => {
            this.setPanelCompact(side, !this.isPanelCompact(side));
        });
    }
    openDataWorkspace() {
        return this.#mutate(() => {
            if (!this.openPanel("data"))
                return false;
            this.dataWorkspaceOpen = true;
            return true;
        });
    }
    closeDataWorkspace() {
        return this.#mutate(() => {
            this.dataWorkspaceOpen = false;
        });
    }
    setAutoFlow(enabled) {
        return this.#mutate(() => {
            const mode = enabled ? "auto" : "manual";
            if (this.doc.pagination.mode === mode)
                return;
            this.engine.execute({
                type: "pagination:update",
                payload: { changes: { mode } },
            });
        });
    }
    toggleAutoFlow() {
        return this.#mutate(() => {
            this.setAutoFlow(this.doc.pagination.mode !== "auto");
        });
    }
    canRunCommand(commandId, context = {}) {
        if (this.historicalPreviewActive &&
            commandId !== "document.version-history")
            return false;
        const command = this.extensions.command(commandId);
        return !!command && (command.canRun?.(this, context) ?? true);
    }
    runCommand(commandId, context = {}) {
        return this.#mutate(() => {
            if (this.historicalPreviewActive &&
                commandId !== "document.version-history") {
                this.setHostStatus("Return to the current version before editing", "warning");
                return Promise.resolve(false);
            }
            return this.extensions.runCommand(commandId, this, context);
        });
    }
    /** @deprecated Use canRunCommand(). */
    canRunExtensionCommand(commandId) {
        return this.canRunCommand(commandId);
    }
    /** @deprecated Use runCommand(). */
    runExtensionCommand(commandId) {
        return this.#mutate(() => {
            return this.runCommand(commandId);
        });
    }
    async saveToHost() {
        if (this.destroyed)
            return false;
        if (this.historicalPreviewActive) {
            this.setHostStatus("Return to the current version before saving", "warning");
            return false;
        }
        if (!this.host.onSave)
            return false;
        const epoch = this.documentEpoch;
        this.setHostStatus("Saving…");
        try {
            const saved = await this.host.onSave(this.engine.snapshot());
            if (this.destroyed || this.documentEpoch !== epoch)
                return false;
            this.setHostStatus(saved === false ? "Save failed" : "Saved", saved === false ? "danger" : "success");
            return saved !== false;
        }
        catch {
            if (this.destroyed || this.documentEpoch !== epoch)
                return false;
            this.setHostStatus("Save failed", "danger");
            return false;
        }
    }
    // --- Selection ---
    select(nodeId) {
        return this.#mutate(() => {
            this.selectedId = nodeId;
            const selectionPanel = this.extensions.selectionPanel;
            if (nodeId && selectionPanel)
                this.openPanel(selectionPanel.id, false);
            if (this.editingId && this.editingId !== nodeId)
                this.editingId = null;
        });
    }
    /** Select a component and bring its rendered canvas element into view. */
    selectAndRevealNode(nodeId) {
        return this.#mutate(() => {
            if (!findNode(this.doc, nodeId))
                return false;
            this.select(nodeId);
            this.#view?.revealNode?.(nodeId);
            return true;
        });
    }
    /** Select and reveal the nearest component parent. Region roots have no selectable parent. */
    selectParent(nodeId) {
        return this.#mutate(() => {
            const parent = findParentNode(this.doc, nodeId);
            if (!parent)
                return false;
            return this.selectAndRevealNode(parent.id);
        });
    }
    /** Open Layers and request expansion/scrolling to a component node. */
    revealInLayers(nodeId) {
        return this.#mutate(() => {
            if (!findNode(this.doc, nodeId) || !this.openPanel("layers"))
                return false;
            this.select(nodeId);
            this.layerRevealRevision += 1;
            return true;
        });
    }
    openContextMenu(x, y, nodeId) {
        return this.#mutate(() => {
            this.selectedId = nodeId;
            this.contextMenu = { x, y, nodeId };
        });
    }
    closeContextMenu() {
        return this.#mutate(() => {
            this.contextMenu = null;
        });
    }
    // --- Data context (merged sample data of all sources) ---
    setDataPreview(enabled) {
        return this.#mutate(() => {
            this.dataPreviewEnabled = enabled;
        });
    }
    /** Merge every data source's sampleData into one preview context. */
    getDataContext() {
        // Without an installed, policy-permitted data.resolve provider, no
        // sample/tenant data feeds canvas, preview, or exports;
        // capabilityDiagnostics surfaces what the document expected.
        if (!this.isProvidedCapabilityEnabled("data.resolve"))
            return {};
        return mergeSampleData(this.doc.dataSources);
    }
    // --- Node operations ---
    addComponent(type, parentId, index, slot) {
        return this.#mutate(() => {
            const node = this.registry.createNode(type);
            this.engine.execute({
                type: "component:add",
                payload: { parentId, slot, index, node },
            });
            this.selectedId = node.id;
            return node;
        });
    }
    addBlock(blockId, parentId, index, slot) {
        return this.#mutate(() => {
            const block = this.extensions.block(blockId);
            if (!block)
                return null;
            if (block.insert)
                return block.insert({ editor: this, parentId, index, slot });
            if (!block.create)
                return null;
            const node = structuredClone(block.create());
            this.engine.execute({
                type: "component:add",
                payload: { parentId, slot, index, node },
            });
            this.selectedId = node.id;
            return node;
        });
    }
    /** Insert an image node backed by a document asset at an explicit drop target. */
    insertAssetImage(assetId, parentId, index, slot) {
        return this.#mutate(() => {
            const asset = this.engine.doc.assets.find((entry) => entry.id === assetId);
            if (!asset || (asset.type !== "image" && asset.type !== "svg"))
                return null;
            const node = this.registry.createNode("image", {
                src: asset.src,
                alt: asset.name,
                width: asset.width ? `${Math.min(asset.width, 400)}px` : "",
            });
            this.engine.execute({
                type: "component:add",
                payload: { parentId, slot, index, node },
            });
            this.selectedId = node.id;
            return node;
        });
    }
    /** Replace the source of an existing native or imported HTML image with a document asset. */
    applyAssetToImage(assetId, nodeId) {
        return this.#mutate(() => {
            const asset = this.engine.doc.assets.find((entry) => entry.id === assetId);
            const node = findNode(this.engine.doc, nodeId);
            if (!asset ||
                (asset.type !== "image" && asset.type !== "svg") ||
                !isImageElementNode(node))
                return false;
            if (node.type === "image") {
                this.updateProps(node.id, {
                    src: asset.src,
                    alt: String(node.props.alt ?? "").trim() || asset.name,
                });
                return true;
            }
            const attributes = node.props.attributes &&
                typeof node.props.attributes === "object" &&
                !Array.isArray(node.props.attributes)
                ? { ...node.props.attributes }
                : {};
            attributes.src = asset.src;
            if (!String(attributes.alt ?? "").trim())
                attributes.alt = asset.name;
            // An uploaded asset is a single embedded source. Stale responsive sources
            // would otherwise continue to win on high-density displays.
            delete attributes.srcset;
            delete attributes.sizes;
            const previewAttributes = node.props.previewAttributes &&
                typeof node.props.previewAttributes === "object" &&
                !Array.isArray(node.props.previewAttributes)
                ? { ...node.props.previewAttributes }
                : {};
            delete previewAttributes.src;
            delete previewAttributes.srcset;
            delete previewAttributes.sizes;
            this.updateProps(node.id, { attributes, previewAttributes });
            return true;
        });
    }
    /** Register the currently mounted rich-text caret as an expression insertion target. */
    registerInlineExpressionTarget(nodeId, insert) {
        const target = { nodeId, insert };
        this.#inlineExpressionTarget = target;
        return () => {
            if (this.#inlineExpressionTarget === target)
                this.#inlineExpressionTarget = null;
        };
    }
    /** Insert at the active rich-text caret, or replace selected component content outside edit mode. */
    insertExpression(expression) {
        return this.#mutate(() => {
            if (!this.isProvidedCapabilityEnabled("data.bind.author"))
                return false;
            if (this.editingId) {
                const target = this.#inlineExpressionTarget;
                if (!target ||
                    target.nodeId !== this.editingId ||
                    this.selectedId !== this.editingId)
                    return false;
                return target.insert(expression);
            }
            const node = this.selectedNode;
            const definition = this.selectedDefinition;
            if (!node || !definition)
                return false;
            const targetProp = definition.propSchema.content ? "content" : null;
            if (!targetProp)
                return false;
            const dataBindings = node.dataBindings?.filter((binding) => binding.targetProp !== targetProp);
            this.commitPropAuthoring(node.id, targetProp, expression, dataBindings?.length ? dataBindings : undefined);
            return true;
        });
    }
    moveNode(nodeId, targetParentId, targetIndex, targetSlot) {
        return this.#mutate(() => {
            this.engine.execute({
                type: "component:move",
                payload: { nodeId, targetParentId, targetSlot, targetIndex },
            });
        });
    }
    updateProps(nodeId, props) {
        return this.#mutate(() => {
            const target = this.#editableFlowTarget(nodeId);
            this.engine.batch([
                ...target.commands,
                {
                    type: "component:update",
                    payload: { nodeId: target.nodeId, changes: { props } },
                },
            ]);
            this.selectedId = target.nodeId;
        });
    }
    /** Commit rich-text content and its explicit binding metadata as one undo step. */
    commitRichTextAuthoring(nodeId, content, dataBindings) {
        return this.#mutate(() => {
            const allowedBindings = this.isProvidedCapabilityEnabled("data.bind.author")
                ? dataBindings
                : dataBindings?.filter((binding) => binding.targetProp !== "content");
            const target = this.#editableFlowTarget(nodeId);
            this.engine.batch([
                ...target.commands,
                {
                    type: "component:update",
                    payload: {
                        nodeId: target.nodeId,
                        changes: {
                            props: { content },
                            dataBindings: allowedBindings?.length
                                ? allowedBindings
                                : undefined,
                        },
                    },
                },
            ]);
            this.selectedId = target.nodeId;
        });
    }
    /** Commit a text-like property and its binding metadata as one undo step. */
    commitPropAuthoring(nodeId, targetProp, value, dataBindings) {
        return this.#mutate(() => {
            const allowedBindings = this.isProvidedCapabilityEnabled("data.bind.author")
                ? dataBindings
                : dataBindings?.filter((binding) => binding.targetProp !== targetProp);
            const target = this.#editableFlowTarget(nodeId);
            this.engine.batch([
                ...target.commands,
                {
                    type: "component:update",
                    payload: {
                        nodeId: target.nodeId,
                        changes: {
                            props: { [targetProp]: value },
                            dataBindings: allowedBindings?.length
                                ? allowedBindings
                                : undefined,
                        },
                    },
                },
            ]);
            this.selectedId = target.nodeId;
        });
    }
    /** Update author-owned page-flow rules, collapsing a split logical node first. */
    updatePaginationRules(nodeId, changes) {
        return this.#mutate(() => {
            const target = this.#editableFlowTarget(nodeId);
            const node = findNode(this.engine.doc, target.nodeId);
            if (!node)
                return;
            const pagination = { ...node.pagination, ...changes };
            for (const [key, value] of Object.entries(pagination)) {
                if (value === undefined || value === false)
                    delete pagination[key];
            }
            this.engine.batch([
                ...target.commands,
                {
                    type: "component:update",
                    payload: {
                        nodeId: target.nodeId,
                        changes: {
                            pagination: Object.keys(pagination).length > 0 ? pagination : undefined,
                        },
                    },
                },
            ]);
            this.selectedId = target.nodeId;
        });
    }
    /** Enter lossless rich-text editing for the complete logical flow node. */
    beginRichTextEdit(nodeId) {
        return this.#mutate(() => {
            const target = this.#editableFlowTarget(nodeId);
            if (target.commands.length > 0)
                this.engine.batch(target.commands);
            this.selectedId = target.nodeId;
            this.editingId = target.nodeId;
        });
    }
    /**
     * Set (or clear with undefined) a value-based style binding on a node.
     * Value bindings are rendered as inline styles by the renderer.
     */
    setStyleBinding(nodeId, property, value) {
        return this.#mutate(() => {
            const target = this.#editableFlowTarget(nodeId);
            const node = findNode(this.engine.doc, target.nodeId);
            if (!node)
                return;
            const bindings = (node.styleBindings ? structuredClone(node.styleBindings) : []).filter((b) => !(b.property === property && b.value !== undefined));
            if (value !== undefined && value !== "")
                bindings.push({ property, value });
            this.engine.batch([
                ...target.commands,
                {
                    type: "component:update",
                    payload: {
                        nodeId: target.nodeId,
                        changes: { styleBindings: bindings },
                    },
                },
            ]);
            this.selectedId = target.nodeId;
        });
    }
    /** Attach or detach a reusable document style class from a logical node. */
    setStyleRuleAttachment(nodeId, ruleId, attached) {
        return this.#mutate(() => {
            const target = this.#editableFlowTarget(nodeId);
            const node = findNode(this.engine.doc, target.nodeId);
            if (!node)
                return;
            this.engine.batch([
                ...target.commands,
                {
                    type: "component:update",
                    payload: {
                        nodeId: target.nodeId,
                        changes: {
                            styleBindings: updateStyleRuleAttachment(node.styleBindings, ruleId, attached),
                        },
                    },
                },
            ]);
            this.selectedId = target.nodeId;
        });
    }
    /** Create a reusable style class and attach it in the same undoable action. */
    createReusableStyleClass(nodeId, name) {
        return this.#mutate(() => {
            const target = this.#editableFlowTarget(nodeId);
            const node = findNode(this.engine.doc, target.nodeId);
            if (!node)
                return null;
            const ruleId = createId("class");
            this.engine.batch([
                ...target.commands,
                {
                    type: "style:add-rule",
                    payload: { rule: createReusableStyleRule(ruleId, name) },
                },
                {
                    type: "component:update",
                    payload: {
                        nodeId: target.nodeId,
                        changes: {
                            styleBindings: updateStyleRuleAttachment(node.styleBindings, ruleId, true),
                        },
                    },
                },
            ]);
            this.selectedId = target.nodeId;
            return ruleId;
        });
    }
    /** Read the current value-based style binding for a property. */
    getStyleBinding(nodeId, property) {
        const node = findNode(this.engine.doc, nodeId);
        return node?.styleBindings?.find((b) => b.property === property && b.value !== undefined)?.value;
    }
    removeNode(nodeId) {
        return this.#mutate(() => {
            this.engine.execute({ type: "component:remove", payload: { nodeId } });
            if (this.selectedId === nodeId)
                this.selectedId = null;
            if (this.hoveredId === nodeId)
                this.hoveredId = null;
        });
    }
    duplicateNode(nodeId) {
        return this.#mutate(() => {
            this.engine.execute({ type: "component:duplicate", payload: { nodeId } });
            const original = locateNode(this.engine.doc, nodeId);
            const copy = original?.siblings[original.index + 1];
            if (copy)
                this.selectedId = copy.id;
        });
    }
    /** Move a node one position up/down among its siblings. */
    moveBy(nodeId, delta) {
        return this.#mutate(() => {
            const location = locateNode(this.engine.doc, nodeId);
            if (!location)
                return;
            const target = delta === -1 ? location.index - 1 : location.index + 2;
            if (target < 0 || target > location.siblings.length)
                return;
            this.engine.execute({
                type: "component:move",
                payload: {
                    nodeId,
                    targetParentId: location.parentId,
                    targetSlot: location.slot,
                    targetIndex: target,
                },
            });
        });
    }
    // --- Symbols ---
    /** Snapshot a node as a reusable symbol and tag the node as its instance. */
    createSymbolFromNode(nodeId) {
        return this.#mutate(() => {
            const node = findNode(this.engine.doc, nodeId);
            if (!node)
                return;
            const definition = cloneNodeDeep(structuredClone(node));
            const label = nodeDisplayLabel(node, this.getDefinition(node.type), 32);
            const symbolId = createId("symbol");
            this.engine.batch([
                {
                    type: "symbol:create",
                    payload: {
                        symbol: { id: symbolId, label, definition, overridableProps: [] },
                    },
                },
                {
                    type: "component:update",
                    payload: { nodeId, changes: { symbolId } },
                },
            ]);
        });
    }
    /** Insert a fresh symbol instance into a drop target or the active page body. */
    insertSymbolInstance(symbolId, parentId, index, slot) {
        return this.#mutate(() => {
            const symbol = this.engine.doc.symbols.find((s) => s.id === symbolId);
            const page = this.activePage;
            const targetParentId = parentId ?? page?.regions.body.id;
            if (!symbol || !targetParentId)
                return null;
            const instance = cloneNodeDeep(structuredClone(symbol.definition));
            instance.symbolId = symbolId;
            this.engine.execute({
                type: "component:add",
                payload: { parentId: targetParentId, slot, index, node: instance },
            });
            this.selectedId = instance.id;
            return instance;
        });
    }
    detachSymbol(nodeId) {
        return this.#mutate(() => {
            this.engine.execute({ type: "symbol:detach", payload: { nodeId } });
        });
    }
    renameSymbol(symbolId, label) {
        return this.#mutate(() => {
            this.engine.execute({
                type: "symbol:rename",
                payload: { symbolId, label },
            });
        });
    }
    /** Delete a saved definition while leaving placed instances as independent content. */
    removeSymbol(symbolId) {
        return this.#mutate(() => {
            this.engine.execute({ type: "symbol:remove", payload: { symbolId } });
        });
    }
    copyNode(nodeId) {
        return this.#mutate(() => {
            const node = findNode(this.engine.doc, nodeId);
            if (node)
                this.clipboard = structuredClone(node);
        });
    }
    /** Paste the clipboard node next to the selected node (or into the body). */
    pasteClipboard() {
        return this.#mutate(() => {
            if (!this.clipboard || !this.activePage)
                return;
            const copy = cloneNodeDeep(this.clipboard);
            const location = this.selectedId
                ? locateNode(this.engine.doc, this.selectedId)
                : null;
            const parentId = location?.parentId ?? this.activePage.regions.body.id;
            const index = location ? location.index + 1 : undefined;
            this.engine.execute({
                type: "component:add",
                payload: { parentId, slot: location?.slot, index, node: copy },
            });
            this.selectedId = copy.id;
        });
    }
    // --- Page operations ---
    addPage() {
        return this.#mutate(() => {
            const page = isWebDocument(this.engine.doc)
                ? createWebPage({
                    slug: uniqueWebSlug(this.engine.doc.pages, "page"),
                })
                : createPage({ label: `Page ${this.engine.doc.pages.length + 1}` });
            this.engine.execute({ type: "page:add", payload: { page } });
            this.activePageIndex = this.engine.doc.pages.length - 1;
        });
    }
    duplicatePage(pageId = this.activePage?.id) {
        return this.#mutate(() => {
            const source = this.engine.doc.pages.find((page) => page.id === pageId);
            if (!source)
                return;
            const page = clonePageDeep(source);
            if (isWebDocument(this.engine.doc)) {
                const slug = uniqueWebSlug(this.engine.doc.pages, source.web?.slug || "page");
                page.label = webPageLabelFromSlug(slug);
                page.web = {
                    slug,
                    title: page.label,
                    description: source.web?.description ?? "",
                    className: source.web?.className,
                    inlineStyle: source.web?.inlineStyle,
                };
            }
            else {
                page.label = `${source.label} copy`;
            }
            const index = this.engine.doc.pages.findIndex((item) => item.id === source.id) + 1;
            this.engine.execute({ type: "page:add", payload: { page, index } });
            this.activePageIndex = this.engine.doc.pages.findIndex((item) => item.id === page.id);
        });
    }
    ensureWebChrome(kind) {
        return this.#mutate(() => {
            const existing = this.engine.doc.meta.web?.[kind];
            if (existing)
                return existing.id;
            const region = createRegion();
            const web = {
                ...DEFAULT_WEB_DOCUMENT_SETTINGS,
                ...(this.engine.doc.meta.web ?? {}),
            };
            this.engine.execute({
                type: "document:update",
                payload: {
                    changes: {
                        meta: { ...this.engine.doc.meta, web: { ...web, [kind]: region } },
                    },
                },
            });
            return region.id;
        });
    }
    promoteSelectionToSiteChrome(kind) {
        return this.#mutate(() => {
            const nodeId = this.selectedId;
            if (!nodeId || !isWebDocument(this.engine.doc))
                return false;
            if (!locateNode(this.engine.doc, nodeId))
                return false;
            const parentId = this.ensureWebChrome(kind);
            const index = this.engine.doc.meta.web?.[kind]?.children.length ?? 0;
            this.engine.execute({
                type: "component:move",
                payload: { nodeId, targetParentId: parentId, targetIndex: index },
            });
            return true;
        });
    }
    removePage(pageId) {
        return this.#mutate(() => {
            if (this.engine.doc.pages.length <= 1)
                return;
            this.engine.execute({ type: "page:remove", payload: { pageId } });
            this.activePageIndex = Math.min(this.activePageIndex, this.engine.doc.pages.length - 1);
        });
    }
    /** Open the Print panel from a Word-like header/footer zone on a sheet. */
    openPrintChrome(position, pageIndex, editing = false) {
        return this.#mutate(() => {
            // Without the Print panel there is no UI to leave print-editing mode, so
            // entering it would orphan printEditing and suppress canvas scroll sync.
            if (!this.extensions.panel("print"))
                return;
            this.activePageIndex = pageIndex;
            this.printPreviewPage = pageIndex;
            this.printPosition = position;
            this.printVariant = resolveSectionTemplate(this.engine.doc, position, pageIndex).variant;
            this.printEditing = editing;
            this.openPanel("print");
        });
    }
    updatePrintVariantForPage(position, pageIndex, variant, value) {
        return this.#mutate(() => {
            this.engine.batch(planUpdatePrintVariant(this.engine.doc, position, pageIndex, variant, value).commands);
        });
    }
    startPrintSection(pageIndex) {
        return this.#mutate(() => {
            this.engine.batch(planStartPrintSection(this.engine.doc, pageIndex).commands);
            this.printVariant = resolveSectionTemplate(this.engine.doc, this.printPosition, pageIndex).variant;
        });
    }
    removePrintSectionBreak(pageIndex) {
        return this.#mutate(() => {
            this.engine.batch(planRemovePrintSectionBreak(this.engine.doc, pageIndex).commands);
        });
    }
    setPrintSectionLinked(sectionId, position, linkedToPrevious) {
        return this.#mutate(() => {
            this.engine.batch(planSetPrintSectionLinked(this.engine.doc, sectionId, position, linkedToPrevious).commands);
        });
    }
    updatePrintSection(sectionId, changes) {
        return this.#mutate(() => {
            this.engine.batch(planUpdatePrintSection(this.engine.doc, sectionId, changes).commands);
        });
    }
    updateParagraphFormatting(nodeId, changes) {
        return this.#mutate(() => {
            const target = this.#editableFlowTarget(nodeId);
            const node = findNode(this.engine.doc, target.nodeId);
            const page = this.activePage;
            if (!node || !page)
                return;
            const dimensions = getPageDimensions(page.size, page.orientation);
            const contentWidth = dimensions.width - page.margins.left - page.margins.right;
            const paragraph = normalizeParagraphFormatting({ ...node.paragraph, ...changes }, contentWidth);
            this.engine.batch([
                ...target.commands,
                {
                    type: "component:update",
                    payload: { nodeId: target.nodeId, changes: { paragraph } },
                },
            ]);
            this.selectedId = target.nodeId;
        });
    }
    /** Apply one measured auto-pagination step; returns true when the AST changed. */
    applyPageFlow(measurements) {
        return this.#mutate(() => {
            const plan = planPageFlow(this.engine.doc, measurements);
            this.blockedFlowPageIds = plan.blockedPageIds;
            if (plan.commands.length === 0)
                return false;
            this.engine.batch(plan.commands);
            this.#reconcileSelection();
            return true;
        });
    }
    /** Set (or clear with '') the page background color via the background region. */
    setPageBackground(pageId, color) {
        return this.#mutate(() => {
            const page = this.engine.doc.pages.find((p) => p.id === pageId);
            if (!page)
                return;
            const regions = structuredClone(page.regions);
            const background = regions.background ?? createRegion();
            const style = { ...background.style };
            if (color)
                style.background = color;
            else
                delete style.background;
            regions.background = {
                ...background,
                ...(Object.keys(style).length > 0 ? { style } : { style: undefined }),
            };
            this.engine.execute({
                type: "page:update",
                payload: { pageId, changes: { regions } },
            });
        });
    }
    /** Add or remove an optional page region (header/footer/background). */
    toggleRegion(pageId, name) {
        return this.#mutate(() => {
            const page = this.engine.doc.pages.find((p) => p.id === pageId);
            if (!page)
                return;
            const regions = structuredClone(page.regions);
            if (regions[name]) {
                delete regions[name];
            }
            else {
                regions[name] = createRegion();
            }
            this.engine.execute({
                type: "page:update",
                payload: { pageId, changes: { regions } },
            });
        });
    }
    /** Fit the active page width into the canvas viewport. */
    zoomToFit(viewportWidth = this.#view?.viewportWidth?.()) {
        return this.#mutate(() => {
            const page = this.activePage;
            if (!page || !viewportWidth)
                return;
            const contentWidth = isWebDocument(this.doc)
                ? (this.doc.meta.web?.viewportWidth ?? 1440)
                : mmToPx(getPageDimensions(page.size, page.orientation).width);
            this.zoom = fitZoom(contentWidth, viewportWidth, 48, 2);
        });
    }
    // --- History ---
    undo() {
        return this.#mutate(() => {
            this.engine.undo();
            this.#reconcileSelection();
        });
    }
    redo() {
        return this.#mutate(() => {
            this.engine.redo();
            this.#reconcileSelection();
        });
    }
    #reconcileSelection() {
        if (this.selectedId && !findNode(this.engine.doc, this.selectedId)) {
            this.selectedId = null;
        }
        this.activePageIndex = Math.max(0, Math.min(this.activePageIndex, this.engine.doc.pages.length - 1));
    }
    #editableFlowTarget(nodeId) {
        const node = findNode(this.engine.doc, nodeId);
        if (!node?.flow)
            return { nodeId, commands: [] };
        const collapse = planCollapseFlowGroup(this.engine.doc, node.flow.groupId);
        return { nodeId: collapse.rootId ?? nodeId, commands: collapse.commands };
    }
}
export function createEditorSession(options = {}) {
    return new EditorSession(options);
}
