import { createDocument, createPage } from './create.js';
import type { ExemplaraDocument, Page, WebDocumentSettings, WebPageSettings } from './types.js';

export const DEFAULT_WEB_DOCUMENT_SETTINGS: WebDocumentSettings = {
  viewportWidth: 1440,
  minHeight: 900,
  canvasBackground: '#171717',
  bodyBackground: '#0f0f0f',
  language: 'en',
  customCss: '',
  importMode: 'native',
};

export const DEFAULT_WEB_PAGE_SETTINGS: WebPageSettings = {
  slug: '',
  title: 'Home',
  description: '',
};

export interface CreateWebDocumentInit {
  name?: string;
  author?: string;
  slug?: string;
  description?: string;
  settings?: Partial<WebDocumentSettings>;
  page?: Partial<WebPageSettings>;
}

/** Create a one-route, responsive web document using the shared Exemplara AST. */
export function createWebDocument(init: CreateWebDocumentInit = {}): ExemplaraDocument {
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

export function isWebDocument(document: ExemplaraDocument): boolean {
  return document.meta.medium === 'web';
}

/** Match an authored href to a document route index, or null to leave hash/external links alone. */
export function resolveWebRouteHref(document: ExemplaraDocument, href: string): number | null {
  const raw = href.trim();
  if (!raw || /^(?:https?:|mailto:|tel:|javascript:)/i.test(raw)) return null;
  const path = raw.startsWith('#')
    ? raw.slice(1)
    : raw.replace(/^[./]+/, '').split(/[/?#]/)[0] ?? '';
  const slug = normalizeWebSlug(path);
  if (!slug) return raw === '/' || raw === '#' || raw === '#top' || raw === '' ? 0 : null;
  const index = document.pages.findIndex((page) => normalizeWebSlug(page.web?.slug ?? '') === slug);
  return index >= 0 ? index : null;
}

/** Empty slug is the website home (`/`). Other slugs are path segments without slashes. */
export function normalizeWebSlug(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/^\/+|\/+$/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function webPageLabelFromSlug(slug: string): string {
  if (!slug) return 'Home';
  return slug
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ') || 'Page';
}

export function uniqueWebSlug(
  pages: readonly Page[],
  desired: string,
  exceptPageId?: string,
): string {
  const base = normalizeWebSlug(desired);
  const taken = new Set(
    pages
      .filter((page) => page.id !== exceptPageId)
      .map((page) => normalizeWebSlug(page.web?.slug ?? '')),
  );
  if (!taken.has(base)) return base;
  if (!base) return uniqueWebSlug(pages, 'page', exceptPageId);
  let n = 2;
  while (taken.has(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}

export function createWebPage(init: {
  label?: string;
  slug?: string;
  title?: string;
  description?: string;
} = {}): Page {
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
export function usesImportedSiteChrome(web?: WebDocumentSettings | null): boolean {
  if (!web) return false;
  if (web.importMode === 'lossless-html') return true;
  return web.importMode === 'native' && Boolean(web.customCss?.trim());
}
