import type { ComponentNode, ExemplaraDocument } from '../core/types.js';
export interface HtmlImportOptions {
    documentName?: string;
    css?: string;
    /** Keep absolute HTTPS image sources. Disable for a fully network-isolated import. */
    allowRemoteImages?: boolean;
    /**
     * Treat a single layout wrapper as page-level presentation and import its
     * children as direct body flow blocks. Useful for generated print templates
     * whose tables and rich text must paginate independently.
     */
    promoteSinglePageRoot?: boolean;
    /** Keep all imported blocks on one authored page and let auto-flow paginate them. */
    pageStrategy?: 'auto' | 'single';
    /** Import semantic website nodes, Handlebars preview controls, and route metadata. */
    web?: boolean;
    /**
     * Convert website markup to native web-section/text/link nodes with style
     * rules, instead of lossless html-element clones.
     */
    native?: boolean;
}
export interface HtmlImportResult {
    document: ExemplaraDocument;
    warnings: string[];
}
interface ImportedPageEntry {
    node: ComponentNode;
    tag: string;
}
/** Parse declarations using a deliberately small, network-free CSS subset. */
export declare function sanitizeImportedDeclarations(source: string, allowImageUrls?: boolean): Record<string, string>;
export declare function groupImportedPageNodes(imported: readonly ImportedPageEntry[], hasPageRoot: boolean, pageStrategy?: 'auto' | 'single'): ComponentNode[][];
/** Convert untrusted HTML/CSS into the Exemplara AST; raw markup is never retained. */
export declare function importHtmlCss(markup: string, options?: HtmlImportOptions): HtmlImportResult;
/**
 * Point imported template CSS variables (`--mujo-bg`, `--quay-page`, …) at the
 * Document design system so the Design panel actually restyles the page.
 */
export declare function bindImportedCssToDesignTokens(document: ExemplaraDocument): boolean;
export {};
