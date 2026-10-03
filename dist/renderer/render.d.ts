import type { BoxSpacing, ComponentNode, ExemplaraDocument, Page } from '../core/types.js';
import { type DataContext, type DataSourceMap } from './data.js';
import type { RenderContext } from './registry.js';
import { type RenderRuntime } from './runtime.js';
import type { TemplateExpressionRuntime } from '../shared/expression.js';
import { type CapabilityPolicy } from '../core/capabilities.js';
export interface RenderOptions {
    dataContext?: DataContext;
    /**
     * Resolve inline expressions, explicit bindings, repeaters, and conditions.
     * Set to false for manual-only editor previews. Document sample data and
     * caller data are ignored and authored expressions remain visible.
     * Defaults to true for backward compatibility.
     */
    resolveData?: boolean;
    /**
     * Per-source data keyed by DataSource id. Bindings resolve against
     * their sourceId's entry first. Merged over the document's own
     * static sampleData (which is used automatically).
     */
    dataSources?: DataSourceMap;
    /** Override page margins for all pages. */
    margins?: BoxSpacing;
    /**
     * 'flow' (default): pages grow with content (min-height sheets).
     * 'fixed': pages are exactly the paper size — footers pin to the sheet
     * bottom and overflowing content clips, matching printed PDF output.
     */
    sheetMode?: 'flow' | 'fixed';
    /**
     * Draw a dashed outline of each page's content box (inside the
     * margins). Screen-only — hidden automatically in print output.
     */
    showMarginGuides?: boolean;
    /** Include editable header/footer HTML inside each physical sheet (default true). */
    includePrintChrome?: boolean;
    /** Internal PDF layout: use Chromium's content box rather than a full physical sheet element. */
    printMode?: boolean;
    /** Global page index offset used when rendering one sheet at a time for PDF merging. */
    pageIndexOffset?: number;
    /** Global page count used by per-sheet PDF rendering. */
    totalPages?: number;
    /** Deterministic value for `{{date}}` (defaults to the document's updated date). */
    templateDate?: string;
    /**
     * Server-side capability enforcement: rendering a document that requires a
     * capability this policy disables throws
     * `UnsupportedDocumentCapabilitiesError` with per-path diagnostics before
     * any output is produced. Every PDF/image entry point renders through
     * here, so one policy guards all export paths.
     */
    policy?: CapabilityPolicy;
    /** Extra CSS appended after document styles. */
    extraCss?: string;
    /** Portable formatters and an optional host expression-engine bridge. */
    expressionRuntime?: TemplateExpressionRuntime;
    /** Instance-scoped component renderers and binding transforms. */
    runtime?: RenderRuntime;
}
export interface RenderResult {
    /** Document body markup (`.ex-document`). */
    html: string;
    /** Assembled stylesheet. */
    css: string;
    /** Complete standalone HTML document. */
    fullHtml: string;
}
export declare function renderNodes(nodes: ComponentNode[], ctx: RenderContext): string;
export declare function renderPageNumber(page: Page, pageIndex: number, totalPages: number): string;
/** Render a document AST to deterministic HTML + CSS. */
export declare function render(doc: ExemplaraDocument, options?: RenderOptions): RenderResult;
