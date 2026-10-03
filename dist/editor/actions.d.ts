import type { EditorSession } from "./session.js";
export interface EditorCommandContext {
    nodeId?: string;
}
export interface EditorCommandDefinition<TEditor = EditorSession, TIcon = string> {
    id: string;
    label: string;
    description?: string;
    icon?: TIcon;
    placement?: "toolbar" | "command-only";
    shortcut?: string;
    danger?: boolean;
    canRun?: (editor: TEditor, context: EditorCommandContext) => boolean;
    execute: (editor: TEditor, context: EditorCommandContext) => boolean | void | Promise<boolean | void>;
}
export type EditorMenuLocation = "node.context" | "node.inline" | "layer.inline" | "inspector.actions";
export interface EditorMenuItemDefinition<TEditor = EditorSession> {
    id: string;
    commandId: string;
    location: EditorMenuLocation;
    group?: string;
    order?: number;
    showWhenDisabled?: boolean;
    when?: (editor: TEditor, context: EditorCommandContext) => boolean;
}
export interface ResolvedEditorMenuItem<TEditor = EditorSession, TIcon = string> {
    id: string;
    group: string;
    order: number;
    enabled: boolean;
    command: EditorCommandDefinition<TEditor, TIcon>;
}
export interface EditorKeybindingDefinition<TEditor = EditorSession> {
    id: string;
    commandId: string;
    key: string;
    mod?: boolean;
    shift?: boolean;
    alt?: boolean;
    order?: number;
    when?: (editor: TEditor, context: EditorCommandContext) => boolean;
}
export interface EditorKeyInput {
    key: string;
    metaKey?: boolean;
    ctrlKey?: boolean;
    shiftKey?: boolean;
    altKey?: boolean;
}
export interface EditorActionRegistry<TEditor = EditorSession, TIcon = string> {
    addCommand(command: EditorCommandDefinition<TEditor, TIcon>): void;
    addMenuItem(item: EditorMenuItemDefinition<TEditor>): void;
    addKeybinding(keybinding: EditorKeybindingDefinition<TEditor>): void;
    commands(): EditorCommandDefinition<TEditor, TIcon>[];
    menuDefinitions(): EditorMenuItemDefinition<TEditor>[];
    keybindingDefinitions(): EditorKeybindingDefinition<TEditor>[];
    command(id: string): EditorCommandDefinition<TEditor, TIcon> | undefined;
    menuItems(location: EditorMenuLocation, editor: TEditor, context?: EditorCommandContext): ResolvedEditorMenuItem<TEditor, TIcon>[];
    runCommand(id: string, editor: TEditor, context?: EditorCommandContext): Promise<boolean>;
    resolveKeybinding(event: EditorKeyInput, editor: TEditor, context?: EditorCommandContext): string | null;
}
export declare function createEditorActionRegistry<TEditor = EditorSession, TIcon = string>(): EditorActionRegistry<TEditor, TIcon>;
