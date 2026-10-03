import type { EditorSession } from "./session.js";

export interface EditorCommandContext {
  nodeId?: string;
}

export interface EditorCommandDefinition<
  TEditor = EditorSession,
  TIcon = string,
> {
  id: string;
  label: string;
  description?: string;
  icon?: TIcon;
  placement?: "toolbar" | "command-only";
  shortcut?: string;
  danger?: boolean;
  canRun?: (editor: TEditor, context: EditorCommandContext) => boolean;
  execute: (
    editor: TEditor,
    context: EditorCommandContext,
  ) => boolean | void | Promise<boolean | void>;
}

export type EditorMenuLocation =
  | "node.context"
  | "node.inline"
  | "layer.inline"
  | "inspector.actions";

export interface EditorMenuItemDefinition<TEditor = EditorSession> {
  id: string;
  commandId: string;
  location: EditorMenuLocation;
  group?: string;
  order?: number;
  showWhenDisabled?: boolean;
  when?: (editor: TEditor, context: EditorCommandContext) => boolean;
}

export interface ResolvedEditorMenuItem<
  TEditor = EditorSession,
  TIcon = string,
> {
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
  menuItems(
    location: EditorMenuLocation,
    editor: TEditor,
    context?: EditorCommandContext,
  ): ResolvedEditorMenuItem<TEditor, TIcon>[];
  runCommand(
    id: string,
    editor: TEditor,
    context?: EditorCommandContext,
  ): Promise<boolean>;
  resolveKeybinding(
    event: EditorKeyInput,
    editor: TEditor,
    context?: EditorCommandContext,
  ): string | null;
}

export function createEditorActionRegistry<
  TEditor = EditorSession,
  TIcon = string,
>(): EditorActionRegistry<TEditor, TIcon> {
  const commands = new Map<string, EditorCommandDefinition<TEditor, TIcon>>();
  const menuItems = new Map<string, EditorMenuItemDefinition<TEditor>>();
  const keybindings = new Map<string, EditorKeybindingDefinition<TEditor>>();

  function addUnique<T>(
    kind: string,
    entries: Map<string, T>,
    id: string,
    value: T,
  ): void {
    if (entries.has(id)) throw new Error(`Duplicate editor ${kind} id: ${id}`);
    entries.set(id, value);
  }

  return {
    addCommand: (command) =>
      addUnique("command", commands, command.id, command),
    addMenuItem: (item) => addUnique("menu item", menuItems, item.id, item),
    addKeybinding: (keybinding) =>
      addUnique("keybinding", keybindings, keybinding.id, keybinding),
    menuDefinitions: () => [...menuItems.values()],
    keybindingDefinitions: () => [...keybindings.values()],
    commands: () => [...commands.values()],
    command: (id) => commands.get(id),
    menuItems(location, editor, context = {}) {
      return [...menuItems.values()]
        .filter((item) => item.location === location)
        .filter((item) => item.when?.(editor, context) ?? true)
        .map((item) => ({ item, command: commands.get(item.commandId) }))
        .filter(
          (
            entry,
          ): entry is {
            item: EditorMenuItemDefinition<TEditor>;
            command: EditorCommandDefinition<TEditor, TIcon>;
          } => !!entry.command,
        )
        .map(({ item, command }) => {
          const enabled = command.canRun?.(editor, context) ?? true;
          return {
            id: item.id,
            group: item.group ?? "50.default",
            order: item.order ?? 50,
            enabled,
            command,
            visible: enabled || item.showWhenDisabled === true,
          };
        })
        .filter((entry) => entry.visible)
        .map(({ visible: _visible, ...entry }) => entry)
        .sort(
          (a, b) =>
            a.group.localeCompare(b.group) ||
            a.order - b.order ||
            a.id.localeCompare(b.id),
        );
    },
    async runCommand(id, editor, context = {}) {
      const command = commands.get(id);
      if (!command || !(command.canRun?.(editor, context) ?? true))
        return false;
      return (await command.execute(editor, context)) !== false;
    },
    resolveKeybinding(event, editor, context = {}) {
      const mod = !!(event.metaKey || event.ctrlKey);
      const candidates = [...keybindings.values()].sort(
        (a, b) => (a.order ?? 50) - (b.order ?? 50),
      );
      for (const binding of candidates) {
        if (binding.key.toLowerCase() !== event.key.toLowerCase()) continue;
        if ((binding.mod ?? false) !== mod) continue;
        if ((binding.shift ?? false) !== !!event.shiftKey) continue;
        if ((binding.alt ?? false) !== !!event.altKey) continue;
        if (!(binding.when?.(editor, context) ?? true)) continue;
        const command = commands.get(binding.commandId);
        if (command && (command.canRun?.(editor, context) ?? true))
          return command.id;
      }
      return null;
    },
  };
}
