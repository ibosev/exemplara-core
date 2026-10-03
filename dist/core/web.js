import { createDocument, createPage } from './create.js';
export const DEFAULT_WEB_DOCUMENT_SETTINGS = {
    viewportWidth: 1440,
    minHeight: 900,
    canvasBackground: '#171717',
    bodyBackground: '#0f0f0f',
    language: 'en',
    customCss: '',
    importMode: 'native',
};
export const DEFAULT_WEB_PAGE_SETTINGS = {
    slug: '',
    title: 'Home',
    description: '',
};
/** Create a one-route, responsive web document using the shared Exemplara AST. */
export function createWebDocument(init = {}) {
    const document = createDocument({
        name: init.name ?? 'Untitled Website',
        author: init.author,
        medium: 'web',
    });
    document.meta.web = { ...DEFAULT_WEB_DOCUMENT_SETTINGS, ...init.settings };
    document.meta.tags = ['website'];
    document.print.enabled = false;
    document.pagination.mode = 'manual';
    document.pagination.removeEmptyPages = false;
    const page = document.pages[0];
    if (page) {
        page.label = 'Home';
        page.margins = { top: 0, right: 0, bottom: 0, left: 0 };
        page.web = {
            ...DEFAULT_WEB_PAGE_SETTINGS,
            title: init.name ?? 'Home',
            slug: init.slug ?? DEFAULT_WEB_PAGE_SETTINGS.slug,
            description: init.description ?? DEFAULT_WEB_PAGE_SETTINGS.description,
            ...init.page,
        };
    }
    return document;
}
export function isWebDocument(document) {
    return document.meta.medium === 'web';
}
/** Match an authored href to a document route index, or null to leave hash/external links alone. */
export function resolveWebRouteHref(document, href) {
    const raw = href.trim();
    if (!raw || /^(?:https?:|mailto:|tel:|javascript:)/i.test(raw))
        return null;
    const path = raw.startsWith('#')
        ? raw.slice(1)
        : raw.replace(/^[./]+/, '').split(/[/?#]/)[0] ?? '';
    const slug = normalizeWebSlug(path);
    if (!slug)
        return raw === '/' || raw === '#' || raw === '#top' || raw === '' ? 0 : null;
    const index = document.pages.findIndex((page) => normalizeWebSlug(page.web?.slug ?? '') === slug);
    return index >= 0 ? index : null;
}
/** Empty slug is the website home (`/`). Other slugs are path segments without slashes. */
export function normalizeWebSlug(value) {
    return value
        .toLowerCase()
        .trim()
        .replace(/^\/+|\/+$/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}
export function webPageLabelFromSlug(slug) {
    if (!slug)
        return 'Home';
    return slug
        .split('-')
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ') || 'Page';
}
export function uniqueWebSlug(pages, desired, exceptPageId) {
    const base = normalizeWebSlug(desired);
    const taken = new Set(pages
        .filter((page) => page.id !== exceptPageId)
        .map((page) => normalizeWebSlug(page.web?.slug ?? '')));
    if (!taken.has(base))
        return base;
    if (!base)
        return uniqueWebSlug(pages, 'page', exceptPageId);
    let n = 2;
    while (taken.has(`${base}-${n}`))
        n += 1;
    return `${base}-${n}`;
}
export function createWebPage(init = {}) {
    const slug = normalizeWebSlug(init.slug ?? '');
    const label = init.label ?? webPageLabelFromSlug(slug);
    const page = createPage({
        label,
        margins: { top: 0, right: 0, bottom: 0, left: 0 },
    });
    page.web = {
        ...DEFAULT_WEB_PAGE_SETTINGS,
        slug,
        title: init.title ?? label,
        description: init.description ?? '',
    };
    return page;
}
/**
 * Imported websites keep the original page chrome: body class, authored CSS,
 * and no Exemplara document reset. Native Cherry Pick presets use native
 * components with this chrome so restaurant CSS still wins.
 */
export function usesImportedSiteChrome(web) {
    if (!web)
        return false;
    if (web.importMode === 'lossless-html')
        return true;
    return web.importMode === 'native' && Boolean(web.customCss?.trim());
}
