import type { BoxSpacing, ExemplaraDocument, PrintTemplate, PrintTemplateVariant } from '../core/types.js';
import type { DataContext } from './data.js';
import { type TemplateExpressionRuntime } from '../shared/expression.js';
export type PrintTemplatePosition = 'header' | 'footer';
export interface PrintTemplateContext {
    pageIndex: number;
    totalPages: number;
    pageLabel: string;
    date: string;
    dataContext?: DataContext;
    expressionRuntime?: TemplateExpressionRuntime;
    /** False keeps `{{expression}}` authoring syntax visible in editor previews. */
    resolveData?: boolean;
}
/** Sanitize the deliberately small HTML subset accepted by print templates. */
export declare function sanitizePrintTemplateHtml(html: string): string;
/** Remove CSS constructs that can execute code or break out of the style tag. */
export declare function sanitizePrintTemplateCss(css: string): string;
export declare function resolvePrintTemplateVariant(template: PrintTemplate, pageIndex: number): {
    variant: PrintTemplateVariant;
    html: string;
};
export declare function renderPrintTemplateHtml(doc: ExemplaraDocument, position: PrintTemplatePosition, context: PrintTemplateContext): {
    html: string;
    variant: PrintTemplateVariant;
};
/** Standalone source used by editor preview iframes. */
export declare function renderPrintTemplateDocument(doc: ExemplaraDocument, position: PrintTemplatePosition, context: PrintTemplateContext): string;
/** Standalone preview for an unsaved HTML/CSS source draft. */
export declare function renderPrintTemplateSourceDocument(doc: ExemplaraDocument, position: PrintTemplatePosition, html: string, css: string, context: PrintTemplateContext, variant?: PrintTemplateVariant): string;
/** Isolated raw-template document used for direct-on-paper contenteditable sessions. */
export declare function renderEditablePrintTemplateDocument(doc: ExemplaraDocument, position: PrintTemplatePosition, html: string): string;
/** HTML passed to Playwright's native Chromium header/footer template API. */
export declare function renderBrowserPrintTemplate(doc: ExemplaraDocument, position: PrintTemplatePosition, context: PrintTemplateContext, horizontalMargins: Pick<BoxSpacing, 'left' | 'right'>): string;
/** Ensure the native browser margin boxes have enough room for the configured templates. */
export declare function effectivePrintMargins(doc: ExemplaraDocument, base: BoxSpacing): BoxSpacing;
