export function createEditorActionRegistry() {
    const commands = new Map();
    const menuItems = new Map();
    const keybindings = new Map();
    function addUnique(kind, entries, id, value) {
        if (entries.has(id))
            throw new Error(`Duplicate editor ${kind} id: ${id}`);
        entries.set(id, value);
    }
    return {
        addCommand: (command) => addUnique("command", commands, command.id, command),
        addMenuItem: (item) => addUnique("menu item", menuItems, item.id, item),
        addKeybinding: (keybinding) => addUnique("keybinding", keybindings, keybinding.id, keybinding),
        menuDefinitions: () => [...menuItems.values()],
        keybindingDefinitions: () => [...keybindings.values()],
        commands: () => [...commands.values()],
        command: (id) => commands.get(id),
        menuItems(location, editor, context = {}) {
            return [...menuItems.values()]
                .filter((item) => item.location === location)
                .filter((item) => item.when?.(editor, context) ?? true)
                .map((item) => ({ item, command: commands.get(item.commandId) }))
                .filter((entry) => !!entry.command)
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
                .sort((a, b) => a.group.localeCompare(b.group) ||
                a.order - b.order ||
                a.id.localeCompare(b.id));
        },
        async runCommand(id, editor, context = {}) {
            const command = commands.get(id);
            if (!command || !(command.canRun?.(editor, context) ?? true))
                return false;
            return (await command.execute(editor, context)) !== false;
        },
        resolveKeybinding(event, editor, context = {}) {
            const mod = !!(event.metaKey || event.ctrlKey);
            const candidates = [...keybindings.values()].sort((a, b) => (a.order ?? 50) - (b.order ?? 50));
            for (const binding of candidates) {
                if (binding.key.toLowerCase() !== event.key.toLowerCase())
                    continue;
                if ((binding.mod ?? false) !== mod)
                    continue;
                if ((binding.shift ?? false) !== !!event.shiftKey)
                    continue;
                if ((binding.alt ?? false) !== !!event.altKey)
                    continue;
                if (!(binding.when?.(editor, context) ?? true))
                    continue;
                const command = commands.get(binding.commandId);
                if (command && (command.canRun?.(editor, context) ?? true))
                    return command.id;
            }
            return null;
        },
    };
}
