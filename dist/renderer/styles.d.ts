import type { DesignTokens, ExemplaraDocument, StyleRule } from '../core/types.js';
/** Standalone-document reset shared by preview, image, and PDF output. */
export declare const DOCUMENT_HTML_RESET_CSS: string;
/**
 * Content CSS used by both the standalone renderer and the interactive canvas.
 * Editor-only selection/drop affordances intentionally live outside this set.
 */
export declare function renderDocumentBaseStyles(rootSelector?: string, pageSelector?: string): string;
/** Emit design tokens as CSS custom properties on :root. */
export declare function renderDesignTokens(tokens: DesignTokens, selector?: string): string;
export declare function renderFontFaces(tokens: DesignTokens): string;
export declare function renderStyleRules(rules: StyleRule[], scope?: string): string;
/** CSS injected into one editor instance so its paper uses renderer styles. */
export declare function renderScopedDocumentStyles(document: ExemplaraDocument, pageSelector: string): string;
