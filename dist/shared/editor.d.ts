import type { ComponentDefinition, ComponentNode, DataSource, PrintTemplateVariant } from '../core/types.js';
/** Merge object-shaped sample data in source order for editor previews. */
export declare function mergeSampleData(sources: readonly DataSource[]): Record<string, unknown>;
/** Resolve the print-template editor tab for a zero-based page index. */
export declare function printVariantForPage(pageIndex: number): PrintTemplateVariant;
/** Consistent layer/tree label shared by editor implementations. */
export declare function nodeDisplayLabel(node: ComponentNode, definition?: ComponentDefinition, maxLength?: number): string;
/** True for both native image components and lossless imported `<img>` nodes. */
export declare function isImageElementNode(node: ComponentNode | null | undefined): node is ComponentNode;
export type EditorShortcutAction = 'undo' | 'redo' | 'copy' | 'paste' | 'duplicate' | 'move-up' | 'move-down' | 'delete' | 'close-context-menu' | 'clear-selection' | 'save';
export interface KeyInput {
    key: string;
    ctrlKey?: boolean;
    metaKey?: boolean;
    shiftKey?: boolean;
    altKey?: boolean;
}
export interface EditorShortcutState {
    hasSelection: boolean;
    hasClipboard: boolean;
    contextMenuOpen: boolean;
    canSave?: boolean;
}
/** Framework-neutral keyboard mapping; hosts decide how each action executes. */
export declare function resolveEditorShortcut(input: KeyInput, state: EditorShortcutState): EditorShortcutAction | null;
