export function registerCoreEditingMenus(api) {
    const menu = (id, commandId, location, group, order, showWhenDisabled = false) => api.addMenuItem({
        id,
        commandId,
        location,
        group,
        order,
        showWhenDisabled,
    });
    menu("node.context.parent", "node.select-parent", "node.context", "10.contextual", 10);
    menu("node.context.reveal", "node.reveal-in-layers", "node.context", "10.contextual", 15);
    menu("node.context.edit-text", "node.edit-text", "node.context", "10.contextual", 20);
    menu("node.context.duplicate", "node.duplicate", "node.context", "20.edit", 10);
    menu("node.context.copy", "node.copy", "node.context", "20.edit", 20);
    menu("node.context.paste", "node.paste-after", "node.context", "20.edit", 30, true);
    menu("node.context.move-up", "node.move-up", "node.context", "30.order", 10);
    menu("node.context.move-down", "node.move-down", "node.context", "30.order", 20);
    menu("node.context.lock", "node.lock", "node.context", "40.structure", 20);
    menu("node.context.unlock", "node.unlock", "node.context", "40.structure", 20);
    menu("node.context.hide", "node.hide", "node.context", "40.structure", 30);
    menu("node.context.show", "node.show", "node.context", "40.structure", 30);
    menu("node.context.delete", "node.delete", "node.context", "90.danger", 10);
    menu("node.inline.edit-text", "node.edit-text", "node.inline", "10.primary", 10);
    menu("node.inline.parent", "node.select-parent", "node.inline", "10.primary", 20);
    menu("node.inline.duplicate", "node.duplicate", "node.inline", "10.primary", 30);
    menu("layer.inline.parent", "node.select-parent", "layer.inline", "10.primary", 10);
    menu("layer.inline.duplicate", "node.duplicate", "layer.inline", "10.primary", 20);
    menu("layer.inline.hide", "node.hide", "layer.inline", "10.primary", 30);
    menu("layer.inline.show", "node.show", "layer.inline", "10.primary", 30);
    menu("inspector.actions.duplicate", "node.duplicate", "inspector.actions", "10.primary", 10);
    menu("inspector.actions.lock", "node.lock", "inspector.actions", "10.primary", 20);
    menu("inspector.actions.unlock", "node.unlock", "inspector.actions", "10.primary", 20);
    menu("inspector.actions.hide", "node.hide", "inspector.actions", "10.primary", 30);
    menu("inspector.actions.show", "node.show", "inspector.actions", "10.primary", 30);
    menu("inspector.actions.delete", "node.delete", "inspector.actions", "10.primary", 40);
}
export function registerCoreEditingKeybindings(api) {
    const keybinding = (id, commandId, key, options = {}) => api.addKeybinding({ id, commandId, key, ...options });
    keybinding("history.undo", "history.undo", "z", { mod: true });
    keybinding("history.redo-shift", "history.redo", "z", {
        mod: true,
        shift: true,
    });
    keybinding("history.redo-y", "history.redo", "y", { mod: true });
    keybinding("node.copy", "node.copy", "c", { mod: true });
    keybinding("node.paste", "node.paste-after", "v", { mod: true });
    keybinding("node.duplicate", "node.duplicate", "d", { mod: true });
    keybinding("node.move-up", "node.move-up", "ArrowUp", { alt: true });
    keybinding("node.move-down", "node.move-down", "ArrowDown", { alt: true });
    keybinding("node.delete", "node.delete", "Delete");
    keybinding("node.backspace", "node.delete", "Backspace");
    keybinding("document.save", "document.save", "s", { mod: true });
    keybinding("context-menu.close", "context-menu.close", "Escape", {
        order: 10,
    });
    keybinding("selection.clear", "selection.clear", "Escape", { order: 20 });
}
