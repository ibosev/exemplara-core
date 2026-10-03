import type { ComponentNode, ExemplaraDocument, StyleRule } from '../core/types.js';
import { type HtmlImportOptions, type HtmlImportResult } from './html-import.js';
export interface HtmlFragmentTarget {
    /** Insert after or replace this node when it belongs to the target document. */
    selectedNodeId?: string | null;
    /** Fallback page when there is no valid selection. */
    activePageId?: string | null;
    /** Defaults to inserting after the selection. */
    placement?: 'after' | 'replace';
}
export interface HtmlFragmentResult {
    document: ExemplaraDocument;
    nodeIds: string[];
    warnings: string[];
    insertedAfterSelection: boolean;
    replacedSelection: boolean;
}
export interface PreparedHtmlFragment {
    nodes: ComponentNode[];
    rules: StyleRule[];
    warnings: string[];
    customCss?: string;
}
/** Detach an imported fragment and remap its style ids for a target document. */
export declare function prepareHtmlImportFragment(document: ExemplaraDocument, imported: HtmlImportResult): PreparedHtmlFragment;
/** Merge an already sanitized HTML import into an existing document. */
export declare function applyHtmlImportFragment(document: ExemplaraDocument, imported: HtmlImportResult, target?: HtmlFragmentTarget): HtmlFragmentResult;
/** Sanitize an HTML/CSS fragment and merge its editable AST into a document. */
export declare function insertHtmlCssFragment(document: ExemplaraDocument, markup: string, options?: HtmlImportOptions & HtmlFragmentTarget): HtmlFragmentResult;
