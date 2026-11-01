import { BUILTIN_TEMPLATE_FORMATTERS, } from "../shared/expression.js";
import { legacyRenderRuntime, } from "../renderer/runtime.js";
import { findNode } from "../core/tree.js";
import { createAllowAllCapabilityPolicy, } from "../core/capabilities.js";
import { createEditorActionRegistry, } from "./actions.js";
import { DEFAULT_PANEL_ORDER, } from "./extension-types.js";
import { RegistrationScope, cleanupAll } from "./registration-scope.js";
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
    #plugins = new Map();
    #installing = new Set();
    #rootScope = new RegistrationScope();
    #scopes = new Set([this.#rootScope]);
    #view;
    #session;
    #destroyed = false;
    #createApi;
    api;
    hasViewContribution(kind, id) {
        return (kind === "inspector-section"
            ? this.#inspectorSections
            : kind === "toolbar-cluster"
                ? this.#toolbarClusters
                : this.#canvasDecorations).has(id);
    }
    start(session) {
        if (session.destroyed || this.#destroyed)
            throw new Error("Cannot start a destroyed editor session.");
        this.#session = session;
        for (const scope of this.#scopes)
            scope.start(session);
    }
    /** Portable installation is atomic and belongs to the session, including fallback installs. */
    install(plugin) {
        this.#assertActive();
        if (this.#plugins.has(plugin.id))
            return;
        if (this.#installing.has(plugin.id))
            throw new Error(`Circular editor plugin installation: ${plugin.id}`);
        this.#transaction(() => {
            this.#installing.add(plugin.id);
            try {
                this.#plugins.set(plugin.id, this.#setup([plugin.setup]));
            }
            finally {
                this.#installing.delete(plugin.id);
            }
        });
    }
    /** Replace the current view's registrations; failed setup restores the previous view. */
    attach(...extensions) {
        this.#assertActive();
        const previous = this.#view;
        let scope;
        try {
            previous?.deactivate();
            scope = this.#transaction(() => this.#setup(extensions));
        }
        catch (error) {
            this.#rethrow(error, [() => previous?.activate()]);
        }
        this.#view = scope;
        return () => {
            if (this.#view === scope)
                this.#view = undefined;
            this.#scopes.delete(scope);
            scope.dispose();
        };
    }
    #assertActive() {
        if (this.#destroyed)
            throw new Error("Editor plugin registry has been destroyed.");
    }
    #setup(extensions) {
        const scope = new RegistrationScope(this.#rootScope);
        this.#scopes.add(scope);
        try {
            const api = this.#createApi(scope);
            for (const extension of extensions)
                scope.setup(extension, api);
            if (this.#session)
                scope.start(this.#session);
            // Parents clean up before portable dependencies installed during their setup.
            this.#scopes.delete(scope);
            this.#scopes.add(scope);
            return scope;
        }
        catch (error) {
            this.#scopes.delete(scope);
            this.#rethrow(error, [() => scope.dispose()]);
        }
    }
    #transaction(setup) {
        const previous = new Set(this.#scopes);
        try {
            return setup();
        }
        catch (error) {
            const added = [...this.#scopes].filter((scope) => !previous.has(scope));
            for (const [id, scope] of this.#plugins)
                if (!previous.has(scope))
                    this.#plugins.delete(id);
            for (const scope of added)
                this.#scopes.delete(scope);
            this.#rethrow(error, added.reverse().map((scope) => () => scope.dispose()));
        }
    }
    #rethrow(error, cleanups) {
        try {
            cleanupAll(cleanups);
        }
        catch (cleanupError) {
            throw new AggregateError([error, cleanupError], error instanceof Error ? error.message : String(error), { cause: error });
        }
        throw error;
    }
    #invalidateViews() {
        this.#sortedPanels = undefined;
        this.#sortedInspectorSections = undefined;
        this.#sortedToolbarClusters = undefined;
        this.#sortedCanvasDecorations = undefined;
    }
    constructor(componentRegistry, extensions = [], options = {}) {
        const policy = options.policy ?? createAllowAllCapabilityPolicy();
        const services = options.services ?? {};
        const renderRuntime = options.renderRuntime ?? legacyRenderRuntime();
        this.#createApi = (scope) => {
            const set = (entries, id, value) => {
                scope.set(entries, id, () => entries.get(id), (entry) => {
                    if (entry === undefined)
                        entries.delete(id);
                    else
                        entries.set(id, entry);
                    this.#invalidateViews();
                }, value);
            };
            const add = (kind, entries, id, value) => {
                if (entries.has(id))
                    throw new Error(`Duplicate editor ${kind} id: ${id}`);
                set(entries, id, value);
            };
            const api = {
                policy,
                installCore: (plugin) => this.install(plugin),
                onSession: (start) => scope.onSession(start),
                hasCapability: (capability) => policy.allows(capability),
                getService: (id) => services[id],
                addBindingTransform: (name, transform) => scope.set(renderRuntime.transforms, name, () => renderRuntime.transforms.get(name), (value) => {
                    if (value)
                        renderRuntime.transforms.register(name, value);
                    else
                        renderRuntime.transforms.unregister(name);
                }, transform),
                addComponent: (definition, renderer, rendererOptions) => {
                    scope.set(componentRegistry, definition.type, () => componentRegistry.get(definition.type), (value) => {
                        if (value)
                            componentRegistry.register(value);
                        else
                            componentRegistry.unregister(definition.type);
                    }, definition);
                    if (renderer)
                        scope.set(renderRuntime.renderers, definition.type, () => renderRuntime.renderers.get(definition.type), (value) => {
                            if (value)
                                renderRuntime.renderers.register(definition.type, value.render, value);
                            else
                                renderRuntime.renderers.unregister(definition.type);
                        }, {
                            render: renderer,
                            managesChildren: rendererOptions?.managesChildren ?? false,
                        }, (a, b) => a?.render === b?.render &&
                            a?.managesChildren === b?.managesChildren);
                },
                addBlock: (block) => add("block", this.#blocks, block.id, block),
                addPanel: (panel) => add("panel", this.#panels, panel.id, panel),
                addInspectorSection: (section) => add("inspector section", this.#inspectorSections, section.id, section),
                addToolbarCluster: (cluster) => add("toolbar cluster", this.#toolbarClusters, cluster.id, cluster),
                addCanvasDecoration: (decoration) => add("canvas decoration", this.#canvasDecorations, decoration.id, decoration),
                addCommand: (command) => scope.register(() => this.#actions.addCommand(command)),
                addMenuItem: (item) => scope.register(() => this.#actions.addMenuItem(item)),
                addKeybinding: (keybinding) => scope.register(() => this.#actions.addKeybinding(keybinding)),
                addOutlineAction: (action) => {
                    add("outline action", this.#outlineActions, action.id, action);
                    const commandId = action.id;
                    api.addCommand({
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
                        api.addMenuItem({
                            id: `${action.id}.context`,
                            commandId,
                            location: "node.context",
                            group: "10.contextual",
                            order: 80,
                        });
                    }
                    if (placement === "toolbar" || placement === "both") {
                        api.addMenuItem({
                            id: `${action.id}.inline`,
                            commandId,
                            location: "node.inline",
                            group: "20.extensions",
                            order: 50,
                        });
                    }
                },
                addAutocompleteProvider: (provider) => add("autocomplete provider", this.#autocompleteProviders, provider.id, provider),
                addStyleField: (field) => add("style field", this.#styleFields, field.id, field),
                addFormatter: (formatter) => add("formatter", this.#formatters, formatter.name, formatter),
                replaceFormatter: (formatter) => {
                    if (!this.#formatters.has(formatter.name)) {
                        throw new Error(`Cannot replace unknown editor formatter id: ${formatter.name}`);
                    }
                    set(this.#formatters, formatter.name, formatter);
                },
                setExpressionEvaluator: (evaluator) => {
                    if (this.#expressionEvaluator) {
                        throw new Error("Duplicate editor expression evaluator registration.");
                    }
                    scope.set(this, "expression-evaluator", () => this.#expressionEvaluator, (value) => {
                        this.#expressionEvaluator = value;
                    }, evaluator);
                },
            };
            return api;
        };
        this.api = this.#createApi(this.#rootScope);
        try {
            for (const extension of extensions) {
                if (typeof extension === "function")
                    this.#transaction(() => this.#setup([extension]));
                else if (!extension.metadataOnly)
                    this.install(extension);
            }
        }
        catch (error) {
            this.#rethrow(error, [() => this.destroy()]);
        }
    }
    destroy() {
        if (this.#destroyed)
            return;
        this.#destroyed = true;
        this.#view = undefined;
        this.#session = undefined;
        this.#plugins.clear();
        const scopes = [...this.#scopes].reverse();
        this.#scopes.clear();
        cleanupAll(scopes.map((scope) => () => scope.dispose()));
    }
    get panels() {
        // Registration changes invalidate the cached order.
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
