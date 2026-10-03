import type {
  ComponentDefinition,
  ComponentNode,
  DataSource,
  PrintTemplateVariant,
} from '../core/types.js';
import { toPlainText } from './richtext.js';

/** Merge object-shaped sample data in source order for editor previews. */
export function mergeSampleData(sources: readonly DataSource[]): Record<string, unknown> {
  const context: Record<string, unknown> = {};
  for (const source of sources) {
    if (source.sampleData && typeof source.sampleData === 'object' && !Array.isArray(source.sampleData)) {
      Object.assign(context, source.sampleData);
    }
  }
  return context;
}

/** Resolve the print-template editor tab for a zero-based page index. */
export function printVariantForPage(pageIndex: number): PrintTemplateVariant {
  if (pageIndex <= 0) return 'first';
  return (pageIndex + 1) % 2 === 0 ? 'even' : 'odd';
}

/** Consistent layer/tree label shared by editor implementations. */
export function nodeDisplayLabel(
  node: ComponentNode,
  definition?: ComponentDefinition,
  maxLength = 24,
): string {
  const text = (node.type === 'text' || node.type === 'html-text') && typeof node.props.content === 'string'
    ? toPlainText(node.props.content)
    : '';
  const htmlElement = node.type === 'html-element'
    ? `<${String(node.props.tagName || 'div')}>${
        node.props.htmlId ? ` #${String(node.props.htmlId)}` : ''
      }${
        node.props.className ? ` .${String(node.props.className).trim().split(/\s+/).join('.')}` : ''
      }`
    : node.type === 'web-section'
      ? String(node.props.className || node.props.element || 'section')
      : '';
  const conditions = Array.isArray(node.props.conditions)
    ? node.props.conditions as Array<{ field?: unknown }>
    : [];
  const control = node.type === 'conditional'
    ? `If ${String(conditions[0]?.field ?? 'condition')}`
    : node.type === 'repeater'
      ? `Each ${String(node.props.path || 'items')}`
      : '';
  const label = text || htmlElement || control || definition?.label || node.type;
  return label.length > maxLength ? `${label.slice(0, maxLength)}…` : label;
}

/** True for both native image components and lossless imported `<img>` nodes. */
export function isImageElementNode(node: ComponentNode | null | undefined): node is ComponentNode {
  return !!node && (
    node.type === 'image'
    || (node.type === 'html-element' && String(node.props.tagName ?? '').toLowerCase() === 'img')
  );
}

export type EditorShortcutAction =
  | 'undo'
  | 'redo'
  | 'copy'
  | 'paste'
  | 'duplicate'
  | 'move-up'
  | 'move-down'
  | 'delete'
  | 'close-context-menu'
  | 'clear-selection'
  | 'save';

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
export function resolveEditorShortcut(
  input: KeyInput,
  state: EditorShortcutState,
): EditorShortcutAction | null {
  const key = input.key.toLowerCase();
  const modifier = input.metaKey || input.ctrlKey;
  if (modifier && key === 's' && state.canSave) return 'save';
  if (modifier && key === 'z') return input.shiftKey ? 'redo' : 'undo';
  if (modifier && key === 'y') return 'redo';
  if (modifier && key === 'c' && state.hasSelection) return 'copy';
  if (modifier && key === 'v' && state.hasClipboard) return 'paste';
  if (modifier && key === 'd' && state.hasSelection) return 'duplicate';
  if (input.altKey && input.key === 'ArrowUp' && state.hasSelection) return 'move-up';
  if (input.altKey && input.key === 'ArrowDown' && state.hasSelection) return 'move-down';
  if ((input.key === 'Delete' || input.key === 'Backspace') && state.hasSelection) return 'delete';
  if (input.key === 'Escape') return state.contextMenuOpen ? 'close-context-menu' : 'clear-selection';
  return null;
}
