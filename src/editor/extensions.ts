import type { ComponentRegistry } from "../core/registry.js";
import {
  BUILTIN_TEMPLATE_FORMATTERS,
  type TemplateExpressionEvaluator,
  type TemplateExpressionFormatter,
  type TemplateExpressionRuntime,
} from "../shared/expression.js";
import type { EditorSession } from "./session.js";
import {
  legacyRenderRuntime,
  type RenderRuntime,
} from "../renderer/runtime.js";
import { findNode } from "../core/tree.js";
import {
  createAllowAllCapabilityPolicy,
  type CapabilityPolicy,
} from "../core/capabilities.js";
import {
  createEditorActionRegistry,
  type EditorCommandContext,
  type EditorCommandDefinition,
  type EditorKeybindingDefinition,
  type EditorKeyInput,
  type EditorMenuItemDefinition,
  type EditorMenuLocation,
  type ResolvedEditorMenuItem,
} from "./actions.js";
import {
  DEFAULT_PANEL_ORDER,
  type EditorAutocompleteProvider,
  type EditorBlockDefinition,
  type EditorExtension,
  type EditorExtensionApi,
  type EditorExtensionDisposer,
  type EditorCanvasDecorationDefinition,
  type EditorInspectorSectionDefinition,
  type EditorOutlineAction,
  type EditorPanelDefinition,
  type EditorToolbarClusterDefinition,
} from "./extension-types.js";
import type { EditorStyleField } from "./style-fields.js";
import type { ComponentNode } from "../core/types.js";
import { addUnique } from "./contribution-utils.js";

export type {
  EditorCommandContext,
  EditorCommandDefinition,
  EditorKeybindingDefinition,
  EditorKeyInput,
  EditorMenuItemDefinition,
  EditorMenuLocation,
  ResolvedEditorMenuItem,
} from "./actions.js";
export * from "./extension-types.js";

export interface EditorExtensionRegistryOptions {
  policy?: CapabilityPolicy;
  services?: Readonly<Record<string, unknown>>;
  renderRuntime?: RenderRuntime;
}

/** Portable behavior registry. View components are registered by wrappers. */
export class EditorExtensionRegistry {
  readonly #panels = new Map<string, EditorPanelDefinition>();
  #sortedPanels: EditorPanelDefinition[] | undefined;
  readonly #inspectorSections = new Map<
    string,
    EditorInspectorSectionDefinition
  >();
  #sortedInspectorSections: EditorInspectorSectionDefinition[] | undefined;
  readonly #toolbarClusters = new Map<string, EditorToolbarClusterDefinition>();
  #sortedToolbarClusters: EditorToolbarClusterDefinition[] | undefined;
  readonly #canvasDecorations = new Map<
    string,
    EditorCanvasDecorationDefinition
  >();
  #sortedCanvasDecorations: EditorCanvasDecorationDefinition[] | undefined;
  readonly #actions = createEditorActionRegistry();
  readonly #blocks = new Map<string, EditorBlockDefinition>();
  readonly #outlineActions = new Map<string, EditorOutlineAction>();
  readonly #autocompleteProviders = new Map<
    string,
    EditorAutocompleteProvider
  >();
  readonly #styleFields = new Map<string, EditorStyleField>();
  readonly #formatters = new Map<string, TemplateExpressionFormatter>(
    BUILTIN_TEMPLATE_FORMATTERS.map((formatter) => [formatter.name, formatter]),
  );
  #expressionEvaluator: TemplateExpressionEvaluator | undefined;
  readonly #disposers: EditorExtensionDisposer[] = [];

  readonly api: EditorExtensionApi;
  readonly #sessionStarts: Array<
    (session: EditorSession) => void | EditorExtensionDisposer
  > = [];

  hasViewContribution(
    kind: "inspector-section" | "toolbar-cluster" | "canvas-decoration",
    id: string,
  ): boolean {
    return (
      kind === "inspector-section"
        ? this.#inspectorSections
        : kind === "toolbar-cluster"
          ? this.#toolbarClusters
          : this.#canvasDecorations
    ).has(id);
  }

  start(session: EditorSession): void {
    if (session.destroyed) throw new Error("Cannot start a destroyed editor session.");
    for (const start of this.#sessionStarts.splice(0)) {
      const dispose = start(session);
      if (dispose) this.#disposers.push(dispose);
    }
  }

  constructor(
    componentRegistry: ComponentRegistry,
    extensions: readonly EditorExtension[] = [],
    options: EditorExtensionRegistryOptions = {},
  ) {
    const policy = options.policy ?? createAllowAllCapabilityPolicy();
    const services = options.services ?? {};
    const renderRuntime = options.renderRuntime ?? legacyRenderRuntime();
    const api: EditorExtensionApi = {
      policy,
      onSession: (start) => this.#sessionStarts.push(start),
      hasCapability: (capability) => policy.allows(capability),
      getService: <T = unknown>(id: string) => services[id] as T | undefined,
      addBindingTransform: (name, transform) =>
        renderRuntime.transforms.register(name, transform),
      addComponent: (definition, renderer, rendererOptions) => {
        componentRegistry.register(definition);
        if (renderer)
          renderRuntime.renderers.register(
            definition.type,
            renderer,
            rendererOptions,
          );
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
          throw new Error(
            `Duplicate editor inspector section id: ${section.id}`,
          );
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
          throw new Error(
            `Duplicate editor canvas decoration id: ${decoration.id}`,
          );
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
      addAutocompleteProvider: (provider) =>
        addUnique(
          "autocomplete provider",
          this.#autocompleteProviders,
          provider.id,
          provider,
        ),
      addStyleField: (field) =>
        addUnique("style field", this.#styleFields, field.id, field),
      addFormatter: (formatter) =>
        addUnique("formatter", this.#formatters, formatter.name, formatter),
      replaceFormatter: (formatter) => {
        if (!this.#formatters.has(formatter.name)) {
          throw new Error(
            `Cannot replace unknown editor formatter id: ${formatter.name}`,
          );
        }
        this.#formatters.set(formatter.name, formatter);
      },
      setExpressionEvaluator: (evaluator) => {
        if (this.#expressionEvaluator) {
          throw new Error(
            "Duplicate editor expression evaluator registration.",
          );
        }
        this.#expressionEvaluator = evaluator;
      },
    };
    this.api = api;
    try {
      for (const extension of extensions) {
        const dispose = extension(api);
        if (dispose) this.#disposers.push(dispose);
      }
    } catch (error) {
      this.destroy();
      throw error;
    }
  }

  destroy(): void {
    this.#sessionStarts.length = 0;
    const errors: unknown[] = [];
    for (const dispose of this.#disposers.splice(0).reverse()) {
      try { dispose(); } catch (error) { errors.push(error); }
    }
    if (errors.length) throw new AggregateError(errors, "Editor session cleanup failed.");
  }

  get panels(): EditorPanelDefinition[] {
    // Contributions only register during construction, so the sort is cached.
    this.#sortedPanels ??= [...this.#panels.values()].sort(
      (a, b) =>
        (a.order ?? DEFAULT_PANEL_ORDER) - (b.order ?? DEFAULT_PANEL_ORDER),
    );
    return this.#sortedPanels;
  }

  panelsFor(
    placement: EditorPanelDefinition["placement"],
  ): EditorPanelDefinition[] {
    return this.panels.filter((panel) => panel.placement === placement);
  }

  panel(id: string): EditorPanelDefinition | undefined {
    return this.#panels.get(id);
  }

  /** The panel opened when a node is selected: the first (by order) flagged with activateOnSelection. */
  get selectionPanel(): EditorPanelDefinition | undefined {
    return this.panels.find((panel) => panel.activateOnSelection);
  }

  /** Inspector sections applicable to the given selection, in contribution order. */
  inspectorSections(
    editor: EditorSession,
    node: ComponentNode,
  ): EditorInspectorSectionDefinition[] {
    this.#sortedInspectorSections ??= [
      ...this.#inspectorSections.values(),
    ].sort(
      (a, b) =>
        (a.order ?? DEFAULT_PANEL_ORDER) - (b.order ?? DEFAULT_PANEL_ORDER),
    );
    return this.#sortedInspectorSections.filter(
      (section) => section.visible?.(editor, node) ?? true,
    );
  }

  /** Toolbar clusters currently visible, in contribution order. */
  toolbarClusters(editor: EditorSession): EditorToolbarClusterDefinition[] {
    this.#sortedToolbarClusters ??= [...this.#toolbarClusters.values()].sort(
      (a, b) =>
        (a.order ?? DEFAULT_PANEL_ORDER) - (b.order ?? DEFAULT_PANEL_ORDER),
    );
    return this.#sortedToolbarClusters.filter(
      (cluster) => cluster.visible?.(editor) ?? true,
    );
  }

  /** Visible canvas decorations for one placement, in contribution order. */
  canvasDecorations(
    editor: EditorSession,
    placement: EditorCanvasDecorationDefinition["placement"],
  ): EditorCanvasDecorationDefinition[] {
    this.#sortedCanvasDecorations ??= [
      ...this.#canvasDecorations.values(),
    ].sort(
      (a, b) =>
        (a.order ?? DEFAULT_PANEL_ORDER) - (b.order ?? DEFAULT_PANEL_ORDER),
    );
    return this.#sortedCanvasDecorations.filter(
      (decoration) =>
        decoration.placement === placement &&
        (decoration.visible?.(editor) ?? true),
    );
  }

  get menuDefinitions() {
    return this.#actions.menuDefinitions();
  }
  get keybindingDefinitions() {
    return this.#actions.keybindingDefinitions();
  }

  get commands(): EditorCommandDefinition[] {
    return this.#actions.commands();
  }

  command(id: string): EditorCommandDefinition | undefined {
    return this.#actions.command(id);
  }

  menuItems(
    location: EditorMenuLocation,
    editor: EditorSession,
    context: EditorCommandContext = {},
  ): ResolvedEditorMenuItem[] {
    return this.#actions.menuItems(location, editor, context);
  }

  async runCommand(
    id: string,
    editor: EditorSession,
    context: EditorCommandContext = {},
  ): Promise<boolean> {
    return this.#actions.runCommand(id, editor, context);
  }

  resolveKeybinding(
    event: EditorKeyInput,
    editor: EditorSession,
    context: EditorCommandContext = {},
  ): string | null {
    return this.#actions.resolveKeybinding(event, editor, context);
  }

  get blocks(): EditorBlockDefinition[] {
    return [...this.#blocks.values()].sort(
      (a, b) =>
        a.category.localeCompare(b.category) || a.label.localeCompare(b.label),
    );
  }

  block(id: string): EditorBlockDefinition | undefined {
    return this.#blocks.get(id);
  }

  get outlineActions(): EditorOutlineAction[] {
    return [...this.#outlineActions.values()];
  }

  get autocompleteProviders(): EditorAutocompleteProvider[] {
    return [...this.#autocompleteProviders.values()];
  }

  styleFieldsFor(
    editor: EditorSession,
    node: ComponentNode,
  ): EditorStyleField[] {
    return [...this.#styleFields.values()]
      .filter((field) => field.visible?.(editor, node) ?? true)
      .sort((a, b) => (a.order ?? 50) - (b.order ?? 50));
  }

  get formatters(): TemplateExpressionFormatter[] {
    return [...this.#formatters.values()].sort(
      (a, b) =>
        a.category.localeCompare(b.category) || a.label.localeCompare(b.label),
    );
  }

  get expressionRuntime(): TemplateExpressionRuntime {
    return {
      formatters: this.formatters,
      evaluator: this.#expressionEvaluator,
    };
  }
}
