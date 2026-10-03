import { BUILTIN_TEMPLATE_FORMATTERS, } from "../shared/expression.js";
import { legacyRenderRuntime, } from "../renderer/runtime.js";
import { findNode } from "../core/tree.js";
import { createAllowAllCapabilityPolicy, } from "../core/capabilities.js";
import { createEditorActionRegistry, } from "./actions.js";
import { DEFAULT_PANEL_ORDER, } from "./extension-types.js";
import { addUnique } from "./contribution-utils.js";
export * from "./extension-types.js";
/** Portable behavior registry. View components are registered by wrappers. */
export class EditorExtensionRegistry {
    #panels = new Map();
    #sortedPanels;
    #inspectorSections = new Map();
    #sortedInspectorSections;
    #toolbarClusters = new Map();
    #sortedToolbarClusters;
    #canvasDecorations = new Map();
    #sortedCanvasDecorations;
    #actions = createEditorActionRegistry();
    #blocks = new Map();
    #outlineActions = new Map();
    #autocompleteProviders = new Map();
    #styleFields = new Map();
    #formatters = new Map(BUILTIN_TEMPLATE_FORMATTERS.map((formatter) => [formatter.name, formatter]));
    #expressionEvaluator;
    #disposers = [];
    api;
    #sessionStarts = [];
    hasViewContribution(kind, id) {
        return (kind === "inspector-section"
            ? this.#inspectorSections
            : kind === "toolbar-cluster"
                ? this.#toolbarClusters
                : this.#canvasDecorations).has(id);
    }
    start(session) {
        if (session.destroyed)
            throw new Error("Cannot start a destroyed editor session.");
        for (const start of this.#sessionStarts.splice(0)) {
            const dispose = start(session);
            if (dispose)
                this.#disposers.push(dispose);
        }
    }
    constructor(componentRegistry, extensions = [], options = {}) {
        const policy = options.policy ?? createAllowAllCapabilityPolicy();
        const services = options.services ?? {};
        const renderRuntime = options.renderRuntime ?? legacyRenderRuntime();
        const api = {
            policy,
            onSession: (start) => this.#sessionStarts.push(start),
            hasCapability: (capability) => policy.allows(capability),
            getService: (id) => services[id],
            addBindingTransform: (name, transform) => renderRuntime.transforms.register(name, transform),
            addComponent: (definition, renderer, rendererOptions) => {
                componentRegistry.register(definition);
                if (renderer)
                    renderRuntime.renderers.register(definition.type, renderer, rendererOptions);
            },
            addBlock: (block) => addUnique("block", this.#blocks, block.id, block),
            addPanel: (panel) => {
                if (this.#panels.has(panel.id))
                    throw new Error(`Duplicate editor panel id: ${panel.id}`);
                this.#sortedPanels = undefined;
                this.#panels.set(panel.id, panel);
            },
            addInspectorSection: (section) => {
                if (this.#inspectorSections.has(section.id)) {
                    throw new Error(`Duplicate editor inspector section id: ${section.id}`);
                }
                this.#sortedInspectorSections = undefined;
                this.#inspectorSections.set(section.id, section);
            },
            addToolbarCluster: (cluster) => {
                if (this.#toolbarClusters.has(cluster.id)) {
                    throw new Error(`Duplicate editor toolbar cluster id: ${cluster.id}`);
                }
                this.#sortedToolbarClusters = undefined;
                this.#toolbarClusters.set(cluster.id, cluster);
            },
            addCanvasDecoration: (decoration) => {
                if (this.#canvasDecorations.has(decoration.id)) {
                    throw new Error(`Duplicate editor canvas decoration id: ${decoration.id}`);
                }
                this.#sortedCanvasDecorations = undefined;
                this.#canvasDecorations.set(decoration.id, decoration);
            },
            addCommand: (command) => this.#actions.addCommand(command),
            addMenuItem: (item) => this.#actions.addMenuItem(item),
            addKeybinding: (keybinding) => this.#actions.addKeybinding(keybinding),
            addOutlineAction: (action) => {
                addUnique("outline action", this.#outlineActions, action.id, action);
                const commandId = action.id;
                this.#actions.addCommand({
                    id: commandId,
                    label: action.label,
                    icon: action.icon,
                    danger: action.danger,
                    canRun: (editor, context) => {
                        const node = context.nodeId
                            ? findNode(editor.doc, context.nodeId)
                            : null;
                        return !!node && (action.canRun?.(editor, node) ?? true);
                    },
                    execute: (editor, context) => {
                        const node = context.nodeId
                            ? findNode(editor.doc, context.nodeId)
                            : null;
                        return node ? action.execute(editor, node) : false;
                    },
                });
                const placement = action.placement ?? "menu";
                if (placement === "menu" || placement === "both") {
                    this.#actions.addMenuItem({
                        id: `${action.id}.context`,
                        commandId,
                        location: "node.context",
                        group: "10.contextual",
                        order: 80,
                    });
                }
                if (placement === "toolbar" || placement === "both") {
                    this.#actions.addMenuItem({
                        id: `${action.id}.inline`,
                        commandId,
                        location: "node.inline",
                        group: "20.extensions",
                        order: 50,
                    });
                }
            },
            addAutocompleteProvider: (provider) => addUnique("autocomplete provider", this.#autocompleteProviders, provider.id, provider),
            addStyleField: (field) => addUnique("style field", this.#styleFields, field.id, field),
            addFormatter: (formatter) => addUnique("formatter", this.#formatters, formatter.name, formatter),
            replaceFormatter: (formatter) => {
                if (!this.#formatters.has(formatter.name)) {
                    throw new Error(`Cannot replace unknown editor formatter id: ${formatter.name}`);
                }
                this.#formatters.set(formatter.name, formatter);
            },
            setExpressionEvaluator: (evaluator) => {
                if (this.#expressionEvaluator) {
                    throw new Error("Duplicate editor expression evaluator registration.");
                }
                this.#expressionEvaluator = evaluator;
            },
        };
        this.api = api;
        try {
            for (const extension of extensions) {
                const dispose = extension(api);
                if (dispose)
                    this.#disposers.push(dispose);
            }
        }
        catch (error) {
            this.destroy();
            throw error;
        }
    }
    destroy() {
        this.#sessionStarts.length = 0;
        const errors = [];
        for (const dispose of this.#disposers.splice(0).reverse()) {
            try {
                dispose();
            }
            catch (error) {
                errors.push(error);
            }
        }
        if (errors.length)
            throw new AggregateError(errors, "Editor session cleanup failed.");
    }
    get panels() {
        // Contributions only register during construction, so the sort is cached.
        this.#sortedPanels ??= [...this.#panels.values()].sort((a, b) => (a.order ?? DEFAULT_PANEL_ORDER) - (b.order ?? DEFAULT_PANEL_ORDER));
        return this.#sortedPanels;
    }
    panelsFor(placement) {
        return this.panels.filter((panel) => panel.placement === placement);
    }
    panel(id) {
        return this.#panels.get(id);
    }
    /** The panel opened when a node is selected: the first (by order) flagged with activateOnSelection. */
    get selectionPanel() {
        return this.panels.find((panel) => panel.activateOnSelection);
    }
    /** Inspector sections applicable to the given selection, in contribution order. */
    inspectorSections(editor, node) {
        this.#sortedInspectorSections ??= [
            ...this.#inspectorSections.values(),
        ].sort((a, b) => (a.order ?? DEFAULT_PANEL_ORDER) - (b.order ?? DEFAULT_PANEL_ORDER));
        return this.#sortedInspectorSections.filter((section) => section.visible?.(editor, node) ?? true);
    }
    /** Toolbar clusters currently visible, in contribution order. */
    toolbarClusters(editor) {
        this.#sortedToolbarClusters ??= [...this.#toolbarClusters.values()].sort((a, b) => (a.order ?? DEFAULT_PANEL_ORDER) - (b.order ?? DEFAULT_PANEL_ORDER));
        return this.#sortedToolbarClusters.filter((cluster) => cluster.visible?.(editor) ?? true);
    }
    /** Visible canvas decorations for one placement, in contribution order. */
    canvasDecorations(editor, placement) {
        this.#sortedCanvasDecorations ??= [
            ...this.#canvasDecorations.values(),
        ].sort((a, b) => (a.order ?? DEFAULT_PANEL_ORDER) - (b.order ?? DEFAULT_PANEL_ORDER));
        return this.#sortedCanvasDecorations.filter((decoration) => decoration.placement === placement &&
            (decoration.visible?.(editor) ?? true));
    }
    get menuDefinitions() {
        return this.#actions.menuDefinitions();
    }
    get keybindingDefinitions() {
        return this.#actions.keybindingDefinitions();
    }
    get commands() {
        return this.#actions.commands();
    }
    command(id) {
        return this.#actions.command(id);
    }
    menuItems(location, editor, context = {}) {
        return this.#actions.menuItems(location, editor, context);
    }
    async runCommand(id, editor, context = {}) {
        return this.#actions.runCommand(id, editor, context);
    }
    resolveKeybinding(event, editor, context = {}) {
        return this.#actions.resolveKeybinding(event, editor, context);
    }
    get blocks() {
        return [...this.#blocks.values()].sort((a, b) => a.category.localeCompare(b.category) || a.label.localeCompare(b.label));
    }
    block(id) {
        return this.#blocks.get(id);
    }
    get outlineActions() {
        return [...this.#outlineActions.values()];
    }
    get autocompleteProviders() {
        return [...this.#autocompleteProviders.values()];
    }
    styleFieldsFor(editor, node) {
        return [...this.#styleFields.values()]
            .filter((field) => field.visible?.(editor, node) ?? true)
            .sort((a, b) => (a.order ?? 50) - (b.order ?? 50));
    }
    get formatters() {
        return [...this.#formatters.values()].sort((a, b) => a.category.localeCompare(b.category) || a.label.localeCompare(b.label));
    }
    get expressionRuntime() {
        return {
            formatters: this.formatters,
            evaluator: this.#expressionEvaluator,
        };
    }
}
