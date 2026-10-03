import type { ComponentRegistry } from "../core/registry.js";
import { type TemplateExpressionFormatter, type TemplateExpressionRuntime } from "../shared/expression.js";
import type { EditorSession } from "./session.js";
import { type RenderRuntime } from "../renderer/runtime.js";
import { type CapabilityPolicy } from "../core/capabilities.js";
import { type EditorCommandContext, type EditorCommandDefinition, type EditorKeybindingDefinition, type EditorKeyInput, type EditorMenuItemDefinition, type EditorMenuLocation, type ResolvedEditorMenuItem } from "./actions.js";
import { type EditorAutocompleteProvider, type EditorBlockDefinition, type EditorExtension, type EditorExtensionApi, type EditorCanvasDecorationDefinition, type EditorInspectorSectionDefinition, type EditorOutlineAction, type EditorPanelDefinition, type EditorToolbarClusterDefinition } from "./extension-types.js";
import type { EditorStyleField } from "./style-fields.js";
import type { ComponentNode } from "../core/types.js";
export type { EditorCommandContext, EditorCommandDefinition, EditorKeybindingDefinition, EditorKeyInput, EditorMenuItemDefinition, EditorMenuLocation, ResolvedEditorMenuItem, } from "./actions.js";
export * from "./extension-types.js";
export interface EditorExtensionRegistryOptions {
    policy?: CapabilityPolicy;
    services?: Readonly<Record<string, unknown>>;
    renderRuntime?: RenderRuntime;
}
/** Portable behavior registry. View components are registered by wrappers. */
export declare class EditorExtensionRegistry {
    #private;
    readonly api: EditorExtensionApi;
    hasViewContribution(kind: "inspector-section" | "toolbar-cluster" | "canvas-decoration", id: string): boolean;
    start(session: EditorSession): void;
    constructor(componentRegistry: ComponentRegistry, extensions?: readonly EditorExtension[], options?: EditorExtensionRegistryOptions);
    destroy(): void;
    get panels(): EditorPanelDefinition[];
    panelsFor(placement: EditorPanelDefinition["placement"]): EditorPanelDefinition[];
    panel(id: string): EditorPanelDefinition | undefined;
    /** The panel opened when a node is selected: the first (by order) flagged with activateOnSelection. */
    get selectionPanel(): EditorPanelDefinition | undefined;
    /** Inspector sections applicable to the given selection, in contribution order. */
    inspectorSections(editor: EditorSession, node: ComponentNode): EditorInspectorSectionDefinition[];
    /** Toolbar clusters currently visible, in contribution order. */
    toolbarClusters(editor: EditorSession): EditorToolbarClusterDefinition[];
    /** Visible canvas decorations for one placement, in contribution order. */
    canvasDecorations(editor: EditorSession, placement: EditorCanvasDecorationDefinition["placement"]): EditorCanvasDecorationDefinition[];
    get menuDefinitions(): EditorMenuItemDefinition<EditorSession>[];
    get keybindingDefinitions(): EditorKeybindingDefinition<EditorSession>[];
    get commands(): EditorCommandDefinition[];
    command(id: string): EditorCommandDefinition | undefined;
    menuItems(location: EditorMenuLocation, editor: EditorSession, context?: EditorCommandContext): ResolvedEditorMenuItem[];
    runCommand(id: string, editor: EditorSession, context?: EditorCommandContext): Promise<boolean>;
    resolveKeybinding(event: EditorKeyInput, editor: EditorSession, context?: EditorCommandContext): string | null;
    get blocks(): EditorBlockDefinition[];
    block(id: string): EditorBlockDefinition | undefined;
    get outlineActions(): EditorOutlineAction[];
    get autocompleteProviders(): EditorAutocompleteProvider[];
    styleFieldsFor(editor: EditorSession, node: ComponentNode): EditorStyleField[];
    get formatters(): TemplateExpressionFormatter[];
    get expressionRuntime(): TemplateExpressionRuntime;
}
