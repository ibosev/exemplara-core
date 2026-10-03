import type { ComponentNode, DataBinding, DataSource } from '../core/types.js';
import {
  extractSampleDataPaths,
  resolveDataPath,
  type SampleDataPath,
} from './data-browser.js';

export interface BindingAutocompleteTrigger {
  kind: 'path' | 'formatter';
  /** Offset of the opening `{{` in the editor's plain text. */
  start: number;
  /** End of the token to replace, including an existing trailing `}}`. */
  end: number;
  /** Text typed after `{{`, used to filter suggestions. */
  query: string;
  /** Existing expression to the left of the active pipe. */
  expressionPrefix?: string;
}

export interface BindingAuthoringCommit {
  content: string;
  dataBindings: DataBinding[] | undefined;
  binding?: DataBinding;
}

/** Canonical authoring syntax shared by inline editors and future plugins. */
export function bindingExpression(path: string): string {
  return `{{${path}}}`;
}

/**
 * Return the still-open `{{query` token at a caret, if one exists.
 * Completed expressions and multiline/formatter expressions do not reopen it.
 */
export function findBindingAutocompleteTrigger(
  text: string,
  caretOffset: number,
): BindingAutocompleteTrigger | null {
  const end = Math.max(0, Math.min(caretOffset, text.length));
  const before = text.slice(0, end);
  const start = before.lastIndexOf('{{');
  if (start < 0 || before.lastIndexOf('}}') > start) return null;
  const expression = before.slice(start + 2);
  if (/[\n\r{}]/.test(expression)) return null;
  const replaceEnd = text.slice(end).startsWith('}}') ? end + 2 : end;
  const pipe = expression.lastIndexOf('|');
  if (pipe >= 0) {
    const expressionPrefix = expression.slice(0, pipe).trim();
    const query = expression.slice(pipe + 1).trimStart();
    if (!expressionPrefix || query.includes('|')) return null;
    return { kind: 'formatter', start, end: replaceEnd, query, expressionPrefix };
  }
  return { kind: 'path', start, end: replaceEnd, query: expression.trimStart() };
}

/** Pure string counterpart to the DOM insertion used by the Svelte editor. */
export function completeBindingAutocomplete(
  text: string,
  trigger: BindingAutocompleteTrigger,
  path: string,
): { value: string; caretOffset: number } {
  const expression = trigger.kind === 'formatter'
    ? `{{${trigger.expressionPrefix} | ${path}}}`
    : bindingExpression(path);
  return {
    value: `${text.slice(0, trigger.start)}${expression}${text.slice(trigger.end)}`,
    caretOffset: trigger.start + expression.length,
  };
}

/**
 * Search current JSON paths. Leaf values rank before objects/arrays, then
 * prefix matches rank before contains matches.
 */
export function bindingAutocompleteSuggestions(
  sources: readonly DataSource[],
  query = '',
  limit = 12,
): SampleDataPath[] {
  const normalized = query.trim().toLowerCase();
  const paths = extractSampleDataPaths(sources);
  return paths
    .filter((candidate) => {
      if (!normalized) return true;
      return candidate.path.toLowerCase().includes(normalized)
        || candidate.sourceName.toLowerCase().includes(normalized);
    })
    .sort((a, b) => {
      const aContainer = a.type === 'object' || a.type === 'array' ? 1 : 0;
      const bContainer = b.type === 'object' || b.type === 'array' ? 1 : 0;
      if (aContainer !== bContainer) return aContainer - bContainer;
      const aPrefix = normalized && a.path.toLowerCase().startsWith(normalized) ? 0 : 1;
      const bPrefix = normalized && b.path.toLowerCase().startsWith(normalized) ? 0 : 1;
      return aPrefix - bPrefix || a.path.localeCompare(b.path) || a.sourceName.localeCompare(b.sourceName);
    })
    .slice(0, Math.max(0, limit));
}

/** Use `{{path}}` while editing an explicitly bound text property. */
export function bindingAuthoringValue(
  node: ComponentNode,
  targetProp = 'content',
): string {
  const binding = node.dataBindings?.find((candidate) => candidate.targetProp === targetProp);
  return binding ? bindingExpression(binding.path) : String(node.props[targetProp] ?? '');
}

/** Parse a content value that consists only of one `{{path}}` expression. */
export function parseExactBindingExpression(value: string): string | null {
  const plain = value
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .trim();
  const match = /^\{\{\s*([a-zA-Z_$][\w$]*(?:\.(?:[a-zA-Z_$][\w$]*|\d+))*)\s*\}\}$/.exec(plain);
  return match?.[1] ?? null;
}

/** Locate the source that owns a path, preferring the source selected in autocomplete. */
export function dataSourceIdForPath(
  sources: readonly DataSource[],
  path: string,
  preferredSourceId?: string,
): string | undefined {
  const preferred = preferredSourceId
    ? sources.find((source) => source.id === preferredSourceId)
    : undefined;
  if (preferred && resolveDataPath(preferred.sampleData, path) !== undefined) return preferred.id;
  return sources.find((source) => resolveDataPath(source.sampleData, path) !== undefined)?.id;
}

/**
 * Convert an inline authoring session back into the document model.
 * A single `{{path}}` remains an explicit DataBinding; mixed rich text keeps
 * interpolation in `props.content` and removes only the explicit content binding.
 */
export function commitBindingAuthoring(
  node: ComponentNode,
  content: string,
  sources: readonly DataSource[],
  preferredSourceId?: string,
  targetProp = 'content',
): BindingAuthoringCommit {
  const bindings = node.dataBindings ? structuredClone(node.dataBindings) : [];
  const existingIndex = bindings.findIndex((candidate) => candidate.targetProp === targetProp);
  const existing = existingIndex >= 0 ? bindings[existingIndex] : undefined;
  const path = parseExactBindingExpression(content);

  if (path) {
    const sourceId = dataSourceIdForPath(sources, path, preferredSourceId)
      ?? existing?.sourceId
      ?? sources[0]?.id;
    if (sourceId) {
      const binding: DataBinding = {
        ...existing,
        targetProp,
        sourceId,
        path,
        fallback: existing?.fallback ?? node.props[targetProp] ?? '',
      };
      if (existingIndex >= 0) bindings.splice(existingIndex, 1, binding);
      else bindings.push(binding);
      return {
        // Preserve the author-owned fallback; the binding owns the rendered value.
        content: String(node.props[targetProp] ?? ''),
        dataBindings: bindings,
        binding,
      };
    }
  }

  const remaining = bindings.filter((candidate) => candidate.targetProp !== targetProp);
  return {
    content,
    dataBindings: remaining.length > 0 ? remaining : undefined,
  };
}
