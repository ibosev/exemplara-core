import { assertDocumentCapabilities, type CapabilityPolicy } from '../core/capabilities.js';
import { stripCssCustomProperties } from '../core/custom-css-tokens.js';
import { DEFAULT_WEB_DOCUMENT_SETTINGS, usesImportedSiteChrome } from '../core/web.js';
import type { ExemplaraDocument, Region } from '../core/types.js';
import { escapeAttr } from './escape.js';
import type { DataContext, DataSourceMap } from './data.js';
import { renderNodes } from './render.js';
import { createRenderRuntime, type RenderRuntime } from './runtime.js';
import { createRendererRegistry } from './registry.js';
import { createBindingTransformRegistry } from './data.js';
import type { RenderContext } from './registry.js';
import {
  DOCUMENT_HTML_RESET_CSS,
  renderDesignTokens,
  renderDocumentBaseStyles,
  renderFontFaces,
  renderStyleRules,
} from './styles.js';
import {
  registerHandlebarsControlRenderers,
  registerLosslessControlRenderers,
  registerWebRenderers,
  WEB_COMPONENT_CSS,
} from './web-components.js';
import type { TemplateExpressionRuntime } from '../shared/expression.js';

export interface WebRenderOptions {
  pageIndex?: number;
  dataContext?: DataContext;
  dataSources?: DataSourceMap;
  resolveData?: boolean;
  handlebarsTemplate?: boolean;
  policy?: CapabilityPolicy;
  runtime?: RenderRuntime;
  expressionRuntime?: TemplateExpressionRuntime;
  extraCss?: string;
}

export interface WebRenderResult {
  html: string;
  css: string;
  fullHtml: string;
  pageId: string;
  slug: string;
}

function regionMarkup(region: Region, name: string, ctx: RenderContext): string {
  return `<div class="ex-region ex-region--${escapeAttr(name)}" data-region-id="${escapeAttr(region.id)}">${renderNodes(region.children, ctx)}</div>`;
}

/** Render one route of a web document to static, responsive HTML and CSS. */
export function renderWeb(document: ExemplaraDocument, options: WebRenderOptions = {}): WebRenderResult {
  if (options.policy) assertDocumentCapabilities(document, options.policy);
  const pageIndex = Math.max(0, Math.min(options.pageIndex ?? 0, Math.max(0, document.pages.length - 1)));
  const page = document.pages[pageIndex];
  if (!page) throw new Error('Web documents require at least one page');
  const web = { ...DEFAULT_WEB_DOCUMENT_SETTINGS, ...(document.meta.web ?? {}) };
  const losslessHtml = usesImportedSiteChrome(web);

  // Template rendering installs different control renderers, so never mutate an
  // editor-owned runtime while producing the publication bundle.
  const sourceRuntime = options.runtime ?? createRenderRuntime();
  const runtime: RenderRuntime = {
    renderers: createRendererRegistry(sourceRuntime.renderers.registrations()),
    transforms: createBindingTransformRegistry(sourceRuntime.transforms.entries()),
  };
  if (!runtime.renderers.get('web-section')) registerWebRenderers(runtime.renderers);
  if (options.handlebarsTemplate) registerHandlebarsControlRenderers(runtime.renderers);
  else if (losslessHtml) registerLosslessControlRenderers(runtime.renderers);
  const resolveData = options.resolveData !== false && options.handlebarsTemplate !== true;
  const sources: DataSourceMap = {};
  if (resolveData) {
    for (const source of document.dataSources) {
      if (source.sampleData && typeof source.sampleData === 'object' && !Array.isArray(source.sampleData)) {
        sources[source.id] = source.sampleData as DataContext;
      }
    }
    Object.assign(sources, options.dataSources ?? {});
  }
  const dataContext: DataContext = {};
  if (resolveData) {
    for (const sourceData of Object.values(sources)) Object.assign(dataContext, sourceData);
    Object.assign(dataContext, options.dataContext ?? {});
  }

  const ctx: RenderContext = {
    dataContext,
    sources,
    resolveData,
    pageIndex,
    totalPages: document.pages.length,
    expressionRuntime: options.expressionRuntime,
    renderers: runtime.renderers,
    transforms: runtime.transforms,
    renderChildren: renderNodes,
  };
  const background = page.regions.background
    ? (losslessHtml
        ? renderNodes(page.regions.background.children, ctx)
        : regionMarkup(page.regions.background, 'background', ctx))
    : '';
  const body = losslessHtml
    ? renderNodes(page.regions.body.children, ctx)
    : regionMarkup(page.regions.body, 'body', ctx);
  const chromeHeader = web.header?.children?.length
    ? (losslessHtml ? renderNodes(web.header.children, ctx) : regionMarkup(web.header, 'header', ctx))
    : '';
  const chromeFooter = web.footer?.children?.length
    ? (losslessHtml ? renderNodes(web.footer.children, ctx) : regionMarkup(web.footer, 'footer', ctx))
    : '';
  const pageClassName = (page.web?.className ?? '').split(/\s+/).filter((name) => /^[A-Za-z_][A-Za-z0-9_-]*$/.test(name)).join(' ');
  const pageHtmlId = (page.web?.htmlId ?? '').trim();
  const pageInlineStyle = stripCssCustomProperties((page.web?.inlineStyle ?? '').trim());
  const html = losslessHtml
    ? `${chromeHeader}${background}${body}${chromeFooter}`
    : `<div class="ex-web-document" data-doc-id="${escapeAttr(document.id)}"><main class="${escapeAttr(`ex-web-page ${pageClassName}`.trim())}" data-page-id="${escapeAttr(page.id)}">${chromeHeader}${background}${body}${chromeFooter}</main></div>`;
  const css = [
    losslessHtml ? '' : DOCUMENT_HTML_RESET_CSS,
    losslessHtml ? '' : `html, body { min-height: 100%; background: ${web.canvasBackground}; }`,
    losslessHtml ? '' : renderDocumentBaseStyles('.ex-web-document', '.ex-web-page'),
    losslessHtml ? '' : `.ex-web-document { width: 100%; min-width: 0; }\n.ex-web-page { position: relative; width: 100%; min-height: ${web.minHeight}px; overflow: hidden; background: ${web.bodyBackground}; }\n.ex-web-page > .ex-region--background { position: absolute; inset: 0; pointer-events: none; }\n.ex-web-page > .ex-region--body { position: relative; z-index: 1; display: flex; min-height: inherit; flex-direction: column; }`,
    document.styles.tokens.fonts.length > 0 ? renderFontFaces(document.styles.tokens) : '',
    losslessHtml ? '' : WEB_COMPONENT_CSS,
    losslessHtml ? '' : renderStyleRules(document.styles.rules),
    web.customCss ?? '',
    renderDesignTokens(document.styles.tokens),
    options.extraCss ?? '',
  ].filter(Boolean).join('\n\n');
  const title = page.web?.title || document.name;
  const description = page.web?.description ?? '';
  const language = web.language || 'en';
  const fullHtml = [
    '<!DOCTYPE html>',
    `<html lang="${escapeAttr(language)}">`,
    '<head>',
    '<meta charset="UTF-8" />',
    '<meta name="viewport" content="width=device-width, initial-scale=1.0" />',
    `<title>${escapeAttr(title)}</title>`,
    description ? `<meta name="description" content="${escapeAttr(description)}" />` : '',
    '<style>',
    css,
    '</style>',
    '</head>',
    `<body${losslessHtml && pageClassName ? ` class="${escapeAttr(pageClassName)}"` : ''}${
      losslessHtml && pageHtmlId ? ` id="${escapeAttr(pageHtmlId)}"` : ''
    }${losslessHtml && pageInlineStyle ? ` style="${escapeAttr(pageInlineStyle)}"` : ''}>`,
    html,
    '</body>',
    '</html>',
  ].filter(Boolean).join('\n');
  return { html, css, fullHtml, pageId: page.id, slug: page.web?.slug ?? '' };
}

/** Produce publication-safe Handlebars markup while retaining the native AST as editor data. */
export function renderWebTemplate(document: ExemplaraDocument, options: Omit<WebRenderOptions, 'resolveData' | 'handlebarsTemplate'> = {}): WebRenderResult {
  return renderWeb(document, { ...options, resolveData: false, handlebarsTemplate: true });
}
