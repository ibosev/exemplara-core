import type { CapabilityId, CapabilityPolicy } from "../core/capabilities.js";
import type {
  ComponentDefinition,
  ComponentNode,
  ExemplaraDocument,
} from "../core/types.js";
import type { BindingTransform } from "../renderer/data.js";
import type { NodeRenderer, RendererOptions } from "../renderer/registry.js";
import type { RenderRuntime } from "../renderer/runtime.js";
import type { BindingAutocompleteTrigger } from "../shared/binding-authoring.js";
import type {
  TemplateExpressionEvaluator,
  TemplateExpressionFormatter,
  TemplateExpressionRuntime,
} from "../shared/expression.js";
import type {
  EditorCommandDefinition,
  EditorKeybindingDefinition,
  EditorMenuItemDefinition,
} from "./actions.js";
import type { EditorSession } from "./session.js";
import type { EditorStyleField } from "./style-fields.js";

export interface EditorPanelProps {
  editor: EditorSession;
}

/** Sort order used when a panel contribution omits `order`. Core panels stay below it. */
export const DEFAULT_PANEL_ORDER = 50;

export interface EditorPanelDefinition {
  id: string;
  label: string;
  placement: "left" | "right";
  /** Tab position; also decides each side's initial tab. Defaults to {@link DEFAULT_PANEL_ORDER}. */
  order?: number;
  icon?: string;
  /** Open this panel when a node is selected. The first flagged panel (by order) wins. */
  activateOnSelection?: boolean;
}

export interface EditorToolbarClusterProps {
  editor: EditorSession;
}

export type EditorToolbarZone = "start" | "center" | "end";

/** A group of controls in the top toolbar, rendered in contribution order within its zone. */
export interface EditorToolbarClusterDefinition {
  id: string;
  /**
   * Position in the toolbar. Core clusters use 10–40 (brand, history, status,
   * commands) and 60–80 (zoom, theme, actions); extension clusters default to
   * {@link DEFAULT_PANEL_ORDER} (50) and land between commands and zoom.
   */
  order?: number;
  /**
   * Semantic toolbar area. Editing and document actions start at the left,
   * canvas magnification stays centered, and view/output settings end at the right.
   * Third-party clusters default to `start`.
   */
  zone?: EditorToolbarZone;
  /** Separator rendered before this cluster (suppressed for the first cluster). */
  separator?: "divider" | "spacer";
  visible?: (editor: EditorSession) => boolean;
}

export interface EditorCanvasDecorationProps {
  editor: EditorSession;
}

/** An element rendered around the scrollable sheet surface. */
export interface EditorCanvasDecorationDefinition {
  id: string;
  /**
   * `above` renders between the page-tab strip and the sheet surface;
   * `overlay` renders after the surface for floating, self-positioned chrome.
   */
  placement: "above" | "overlay";
  order?: number;
  visible?: (editor: EditorSession) => boolean;
}

export interface EditorInspectorSectionProps {
  editor: EditorSession;
  node: ComponentNode;
}

/** A section rendered in the Inspector below the selected node's prop fields. */
export interface EditorInspectorSectionDefinition {
  id: string;
  /** Position among sections. Defaults to {@link DEFAULT_PANEL_ORDER}; core sections stay below it. */
  order?: number;
  /** Render only for matching selections; defaults to every node. */
  visible?: (editor: EditorSession, node: ComponentNode) => boolean;
}

export interface EditorBlockDefinition {
  id: string;
  label: string;
  category: string;
  description?: string;
  preview?: string;
  icon?: string;
  source?: "system" | "user" | "plugin";
  openUrl?: string;
  /** Create a typed node directly. Hosts with richer source formats may use `insert` instead. */
  create?: () => ComponentNode;
  /**
   * Insert a host-backed block as one editor operation. This supports formats
   * such as HTML/CSS that need to contribute both component nodes and styles.
   */
  insert?: (context: {
    editor: EditorSession;
    parentId: string;
    index?: number;
    slot?: string;
  }) => ComponentNode | null;
}

export interface EditorOutlineAction {
  id: string;
  label: string;
  icon?: string;
  placement?: "menu" | "toolbar" | "both";
  danger?: boolean;
  canRun?: (editor: EditorSession, node: ComponentNode) => boolean;
  execute: (
    editor: EditorSession,
    node: ComponentNode,
  ) => boolean | void | Promise<boolean | void>;
}

export interface EditorAutocompleteSuggestion {
  id: string;
  value: string;
  label: string;
  kind: "path" | "formatter" | "helper";
  type: string;
  sourceName?: string;
  sourceId?: string;
  preview?: string;
  description?: string;
}

export interface EditorAutocompleteContext {
  trigger: BindingAutocompleteTrigger;
  document: ExemplaraDocument;
  query: string;
}

export interface EditorAutocompleteProvider {
  id: string;
  suggest: (
    context: EditorAutocompleteContext,
  ) => readonly EditorAutocompleteSuggestion[];
}

export interface EditorExtensionApi {
  readonly policy: CapabilityPolicy;
  /** Start once after the session has been initialized. Return a disposer. */
  onSession: (
    start: (session: EditorSession) => void | EditorExtensionDisposer,
  ) => void;
  hasCapability: (capability: CapabilityId) => boolean;
  getService: <T = unknown>(id: string) => T | undefined;
  addBindingTransform: (name: string, transform: BindingTransform) => void;
  addComponent: (
    definition: ComponentDefinition,
    renderer?: NodeRenderer,
    rendererOptions?: RendererOptions,
  ) => void;
  addBlock: (block: EditorBlockDefinition) => void;
  addPanel: (panel: EditorPanelDefinition) => void;
  addInspectorSection: (section: EditorInspectorSectionDefinition) => void;
  addToolbarCluster: (cluster: EditorToolbarClusterDefinition) => void;
  addCanvasDecoration: (decoration: EditorCanvasDecorationDefinition) => void;
  addCommand: (command: EditorCommandDefinition) => void;
  addMenuItem: (item: EditorMenuItemDefinition) => void;
  addKeybinding: (keybinding: EditorKeybindingDefinition) => void;
  addOutlineAction: (action: EditorOutlineAction) => void;
  addAutocompleteProvider: (provider: EditorAutocompleteProvider) => void;
  addStyleField: (field: EditorStyleField) => void;
  addFormatter: (formatter: TemplateExpressionFormatter) => void;
  /** Replace an existing formatter deliberately (normally a portable built-in). */
  replaceFormatter: (formatter: TemplateExpressionFormatter) => void;
  setExpressionEvaluator: (evaluator: TemplateExpressionEvaluator) => void;
}

export type EditorExtensionDisposer = () => void;
export type EditorExtension = (
  api: EditorExtensionApi,
) => void | EditorExtensionDisposer;

export interface EditorBrandConfig {
  mark?: string;
  logoUrl?: string;
  label?: string;
  onClick?: () => void;
}

/** Host-owned editor chrome tokens. Values are CSS colors, lengths, or shadows. */
export interface EditorThemeTokens {
  background?: string;
  backgroundSunken?: string;
  panel?: string;
  border?: string;
  borderStrong?: string;
  text?: string;
  muted?: string;
  accent?: string;
  accentStrong?: string;
  accentSoft?: string;
  danger?: string;
  dangerSoft?: string;
  success?: string;
  warning?: string;
  symbol?: string;
  /** Color used for the selected component outline. */
  selectionOutline?: string;
  /** Color used while directly editing rich text. */
  editingOutline?: string;
  focusRing?: string;
  radius?: string;
  radiusLarge?: string;
  controlHeight?: string;
  toolbarHeight?: string;
}

export interface EditorThemeConfig {
  current: () => "light" | "dark";
  toggle: () => void;
  /** Resolve tokens for the current host theme. Unset values retain Exemplara defaults. */
  tokens?: () => EditorThemeTokens;
}

export interface EditorController {
  readonly document: ExemplaraDocument;
  readonly selectedNodeId: string | null;
  /** Page currently shown by the canvas; useful to host dialogs that insert content. */
  readonly activePageId: string | null;
  readonly dataPreviewEnabled: boolean;
  readonly dataWorkspaceOpen: boolean;
  readonly autoFlowEnabled: boolean;
  readonly renderRuntime: RenderRuntime;
  readonly expressionRuntime: TemplateExpressionRuntime;
  snapshot: () => ExemplaraDocument;
  replaceDocument: (document: ExemplaraDocument) => void;
  selectNode: (nodeId: string | null) => void;
  openPanel: (panelId: string) => boolean;
  isPanelCompact: (side: "left" | "right") => boolean;
  setPanelCompact: (side: "left" | "right", compact: boolean) => void;
  togglePanelCompact: (side: "left" | "right") => void;
  openDataWorkspace: () => boolean;
  closeDataWorkspace: () => void;
  runCommand: (commandId: string) => Promise<boolean>;
  insertExpression: (expression: string) => boolean;
  setDataPreview: (enabled: boolean) => void;
  setAutoFlow: (enabled: boolean) => void;
  toggleAutoFlow: () => void;
  setStatus: (message: string, tone?: EditorStatus["tone"]) => void;
}

export interface EditorStatus {
  message: string;
  tone: "neutral" | "success" | "warning" | "danger";
}

export interface EditorHostConfig {
  brand?: EditorBrandConfig;
  theme?: EditorThemeConfig;
  /** Place contributed actions in their own row or compactly beside page navigation. */
  toolbarPlacement?: "top" | "canvas-tabs";
  /** Hide the optional portable-document JSON download contribution. */
  disableExport?: boolean;
  onReady?: (controller: EditorController) => void;
  onSave?: (document: ExemplaraDocument) => boolean | Promise<boolean>;
}
