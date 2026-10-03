import type { ExemplaraDocument, Page, WebDocumentSettings, WebPageSettings } from './types.js';
export declare const DEFAULT_WEB_DOCUMENT_SETTINGS: WebDocumentSettings;
export declare const DEFAULT_WEB_PAGE_SETTINGS: WebPageSettings;
export interface CreateWebDocumentInit {
    name?: string;
    author?: string;
    slug?: string;
    description?: string;
    settings?: Partial<WebDocumentSettings>;
    page?: Partial<WebPageSettings>;
}
/** Create a one-route, responsive web document using the shared Exemplara AST. */
export declare function createWebDocument(init?: CreateWebDocumentInit): ExemplaraDocument;
export declare function isWebDocument(document: ExemplaraDocument): boolean;
/** Match an authored href to a document route index, or null to leave hash/external links alone. */
export declare function resolveWebRouteHref(document: ExemplaraDocument, href: string): number | null;
/** Empty slug is the website home (`/`). Other slugs are path segments without slashes. */
export declare function normalizeWebSlug(value: string): string;
export declare function webPageLabelFromSlug(slug: string): string;
export declare function uniqueWebSlug(pages: readonly Page[], desired: string, exceptPageId?: string): string;
export declare function createWebPage(init?: {
    label?: string;
    slug?: string;
    title?: string;
    description?: string;
}): Page;
/**
 * Imported websites keep the original page chrome: body class, authored CSS,
 * and no Exemplara document reset. Native Cherry Pick presets use native
 * components with this chrome so restaurant CSS still wins.
 */
export declare function usesImportedSiteChrome(web?: WebDocumentSettings | null): boolean;
