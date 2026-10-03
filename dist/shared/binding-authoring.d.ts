import type { ComponentNode, DataBinding, DataSource } from '../core/types.js';
import { type SampleDataPath } from './data-browser.js';
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
export declare function bindingExpression(path: string): string;
/**
 * Return the still-open `{{query` token at a caret, if one exists.
 * Completed expressions and multiline/formatter expressions do not reopen it.
 */
export declare function findBindingAutocompleteTrigger(text: string, caretOffset: number): BindingAutocompleteTrigger | null;
/** Pure string counterpart to the DOM insertion used by the Svelte editor. */
export declare function completeBindingAutocomplete(text: string, trigger: BindingAutocompleteTrigger, path: string): {
    value: string;
    caretOffset: number;
};
/**
 * Search current JSON paths. Leaf values rank before objects/arrays, then
 * prefix matches rank before contains matches.
 */
export declare function bindingAutocompleteSuggestions(sources: readonly DataSource[], query?: string, limit?: number): SampleDataPath[];
/** Use `{{path}}` while editing an explicitly bound text property. */
export declare function bindingAuthoringValue(node: ComponentNode, targetProp?: string): string;
/** Parse a content value that consists only of one `{{path}}` expression. */
export declare function parseExactBindingExpression(value: string): string | null;
/** Locate the source that owns a path, preferring the source selected in autocomplete. */
export declare function dataSourceIdForPath(sources: readonly DataSource[], path: string, preferredSourceId?: string): string | undefined;
/**
 * Convert an inline authoring session back into the document model.
 * A single `{{path}}` remains an explicit DataBinding; mixed rich text keeps
 * interpolation in `props.content` and removes only the explicit content binding.
 */
export declare function commitBindingAuthoring(node: ComponentNode, content: string, sources: readonly DataSource[], preferredSourceId?: string, targetProp?: string): BindingAuthoringCommit;
