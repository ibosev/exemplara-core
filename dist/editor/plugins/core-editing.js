import { findNode, findParentNode } from "../../core/tree.js";
import { registerCoreEditingKeybindings } from "./core-editing-surfaces.js";
function targetNode(editor, context) {
    const nodeId = context.nodeId ?? editor.selectedId;
    return nodeId ? findNode(editor.doc, nodeId) : null;
}
function targetNodeId(editor, context) {
    return targetNode(editor, context)?.id ?? null;
}
export function createCoreEditingPlugin() {
    return {
        id: "exemplara.core-editing",
        version: "1.0.0",
        provides: ["document.edit", "document.history", "document.clipboard"],
        setup(api) {
            api.addCommand({
                id: "history.undo",
                label: "Undo",
                shortcut: "⌘Z",
                canRun: (editor) => editor.canUndo,
                execute: (editor) => editor.undo(),
            });
            api.addCommand({
                id: "history.redo",
                label: "Redo",
                shortcut: "⇧⌘Z",
                canRun: (editor) => editor.canRedo,
                execute: (editor) => editor.redo(),
            });
            api.addCommand({
                id: "node.select-parent",
                label: "Select parent",
                icon: "IconParent",
                canRun: (editor, context) => {
                    const node = targetNode(editor, context);
                    return !!node && !!findParentNode(editor.doc, node.id);
                },
                execute: (editor, context) => {
                    const nodeId = targetNodeId(editor, context);
                    return nodeId ? editor.selectParent(nodeId) : false;
                },
            });
            api.addCommand({
                id: "node.reveal-in-layers",
                label: "Show in Layers",
                icon: "IconLayers",
                canRun: (editor, context) => !!targetNode(editor, context) && !!editor.extensions.panel("layers"),
                execute: (editor, context) => {
                    const nodeId = targetNodeId(editor, context);
                    return nodeId ? editor.revealInLayers(nodeId) : false;
                },
            });
            api.addCommand({
                id: "node.edit-text",
                label: "Edit text",
                icon: "IconEdit",
                canRun: (editor, context) => {
                    const node = targetNode(editor, context);
                    const definition = node ? editor.getDefinition(node.type) : undefined;
                    return (!!node &&
                        !node.locked &&
                        definition?.propSchema.content?.type === "richtext");
                },
                execute: (editor, context) => {
                    const nodeId = targetNodeId(editor, context);
                    if (!nodeId)
                        return false;
                    editor.beginRichTextEdit(nodeId);
                    return true;
                },
            });
            api.addCommand({
                id: "node.duplicate",
                label: "Duplicate",
                icon: "IconDuplicate",
                shortcut: "⌘D",
                canRun: (editor, context) => !!targetNode(editor, context),
                execute: (editor, context) => {
                    const nodeId = targetNodeId(editor, context);
                    if (!nodeId)
                        return false;
                    editor.duplicateNode(nodeId);
                    return true;
                },
            });
            api.addCommand({
                id: "node.copy",
                label: "Copy",
                icon: "IconCopy",
                shortcut: "⌘C",
                canRun: (editor, context) => !!targetNode(editor, context),
                execute: (editor, context) => {
                    const nodeId = targetNodeId(editor, context);
                    if (!nodeId)
                        return false;
                    editor.copyNode(nodeId);
                    return true;
                },
            });
            api.addCommand({
                id: "node.paste-after",
                label: "Paste after",
                icon: "IconPaste",
                shortcut: "⌘V",
                canRun: (editor) => !!editor.clipboard,
                execute: (editor, context) => {
                    const nodeId = targetNodeId(editor, context);
                    if (nodeId)
                        editor.select(nodeId);
                    editor.pasteClipboard();
                    return true;
                },
            });
            api.addCommand({
                id: "node.move-up",
                label: "Move up",
                icon: "IconArrowUp",
                shortcut: "⌥↑",
                canRun: (editor, context) => !!targetNode(editor, context),
                execute: (editor, context) => {
                    const nodeId = targetNodeId(editor, context);
                    if (!nodeId)
                        return false;
                    editor.moveBy(nodeId, -1);
                    return true;
                },
            });
            api.addCommand({
                id: "node.move-down",
                label: "Move down",
                icon: "IconArrowDown",
                shortcut: "⌥↓",
                canRun: (editor, context) => !!targetNode(editor, context),
                execute: (editor, context) => {
                    const nodeId = targetNodeId(editor, context);
                    if (!nodeId)
                        return false;
                    editor.moveBy(nodeId, 1);
                    return true;
                },
            });
            api.addCommand({
                id: "node.lock",
                label: "Lock",
                icon: "IconLock",
                canRun: (editor, context) => {
                    const node = targetNode(editor, context);
                    return !!node && !node.locked;
                },
                execute: (editor, context) => {
                    const nodeId = targetNodeId(editor, context);
                    if (!nodeId)
                        return false;
                    editor.engine.execute({
                        type: "component:update",
                        payload: { nodeId, changes: { locked: true } },
                    });
                    return true;
                },
            });
            api.addCommand({
                id: "node.unlock",
                label: "Unlock",
                icon: "IconUnlock",
                canRun: (editor, context) => !!targetNode(editor, context)?.locked,
                execute: (editor, context) => {
                    const nodeId = targetNodeId(editor, context);
                    if (!nodeId)
                        return false;
                    editor.engine.execute({
                        type: "component:update",
                        payload: { nodeId, changes: { locked: false } },
                    });
                    return true;
                },
            });
            api.addCommand({
                id: "node.hide",
                label: "Hide",
                icon: "IconEyeOff",
                canRun: (editor, context) => {
                    const node = targetNode(editor, context);
                    return !!node && !node.hidden;
                },
                execute: (editor, context) => {
                    const nodeId = targetNodeId(editor, context);
                    if (!nodeId)
                        return false;
                    editor.engine.execute({
                        type: "component:update",
                        payload: { nodeId, changes: { hidden: true } },
                    });
                    return true;
                },
            });
            api.addCommand({
                id: "node.show",
                label: "Show",
                icon: "IconEye",
                canRun: (editor, context) => !!targetNode(editor, context)?.hidden,
                execute: (editor, context) => {
                    const nodeId = targetNodeId(editor, context);
                    if (!nodeId)
                        return false;
                    editor.engine.execute({
                        type: "component:update",
                        payload: { nodeId, changes: { hidden: false } },
                    });
                    return true;
                },
            });
            api.addCommand({
                id: "node.delete",
                label: "Delete",
                icon: "IconTrash",
                shortcut: "⌫",
                danger: true,
                canRun: (editor, context) => !!targetNode(editor, context),
                execute: (editor, context) => {
                    const nodeId = targetNodeId(editor, context);
                    if (!nodeId)
                        return false;
                    editor.removeNode(nodeId);
                    return true;
                },
            });
            api.addCommand({
                id: "context-menu.close",
                label: "Close context menu",
                canRun: (editor) => !!editor.contextMenu,
                execute: (editor) => editor.closeContextMenu(),
            });
            api.addCommand({
                id: "selection.clear",
                label: "Clear selection",
                canRun: (editor) => !!editor.selectedId,
                execute: (editor) => editor.select(null),
            });
            api.addCommand({
                id: "document.save",
                label: "Save",
                canRun: (editor) => !!editor.host.onSave,
                execute: (editor) => editor.saveToHost(),
            });
            registerCoreEditingKeybindings(api);
        },
    };
}
