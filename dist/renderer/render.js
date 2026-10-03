import { getPageDimensions } from '../core/presets.js';
import { formatPageNumber } from '../shared/math.js';
import { escapeAttr, escapeComment, styleString } from './escape.js';
import { resolveNodeData } from './data.js';
import { legacyRenderRuntime } from './runtime.js';
import { DOCUMENT_HTML_RESET_CSS, renderDesignTokens, renderDocumentBaseStyles, renderFontFaces, renderStyleRules, } from './styles.js';
import { effectivePrintMargins, renderPrintTemplateHtml, sanitizePrintTemplateCss, } from './print-templates.js';
import { assertDocumentCapabilities } from '../core/capabilities.js';
// --- Node rendering ---
function renderNode(node, ctx) {
    if (node.hidden)
        return '';
    const resolved = ctx.resolveData
        ? resolveNodeData(node, ctx.dataContext, ctx.sources, ctx.expressionRuntime, ctx.transforms)
        : node;
    const entry = ctx.renderers.get(resolved.type);
    if (!entry) {
        return `<!-- unknown component: ${escapeComment(resolved.type)} (${escapeComment(resolved.id)}) -->`;
    }
    let children = '';
    if (!entry.managesChildren) {
        children = renderNodes(resolved.children ?? [], ctx);
        for (const slotChildren of Object.values(resolved.slots ?? {})) {
            children += renderNodes(slotChildren, ctx);
        }
    }
    return entry.render(resolved, children, ctx);
}
export function renderNodes(nodes, ctx) {
    return nodes.map((node) => renderNode(node, ctx)).join('');
}
// --- Region / page rendering ---
function renderRegion(region, name, ctx) {
    const style = region.style ? styleString(region.style) : '';
    return `<div class="ex-region ex-region--${escapeAttr(name)}" data-region-id="${escapeAttr(region.id)}"${style ? ` style="${escapeAttr(style)}"` : ''}>${renderNodes(region.children, ctx)}</div>`;
}
export function renderPageNumber(page, pageIndex, totalPages) {
    const numbering = page.pageNumbering;
    if (!numbering)
        return '';
    const value = formatPageNumber(numbering.start + pageIndex, numbering.format);
    const style = styleString({
        'text-align': numbering.alignment,
        'font-size': '10px',
    });
    return `<div class="ex-page-number" style="${escapeAttr(style)}">${escapeAttr(value)} / ${escapeAttr(formatPageNumber(numbering.start + totalPages - 1, numbering.format))}</div>`;
}
function renderPage(doc, page, pageIndex, totalPages, isLastRenderedPage, options, baseCtx) {
    const ctx = {
        ...baseCtx,
        pageIndex,
        totalPages,
        // Expose {{page.number}} / {{page.total}} to interpolation on every page.
        dataContext: {
            ...baseCtx.dataContext,
            page: { number: pageIndex + 1, total: totalPages },
        },
    };
    const dims = getPageDimensions(page.size, page.orientation);
    const m = effectivePrintMargins(doc, options.margins ?? page.margins);
    const fixedSheet = options.sheetMode === 'fixed';
    const contentHeight = Math.max(0, dims.height - m.top - m.bottom);
    const pageStyle = styleString({
        width: options.printMode ? '100%' : `${dims.width}mm`,
        [fixedSheet || options.printMode ? 'height' : 'min-height']: options.printMode
            ? `${contentHeight}mm`
            : `${dims.height}mm`,
        padding: options.printMode ? '0' : `${m.top}mm ${m.right}mm ${m.bottom}mm ${m.left}mm`,
        position: 'relative',
        overflow: 'hidden',
        'page-break-after': isLastRenderedPage ? 'auto' : 'always',
    });
    const parts = [];
    if (options.showMarginGuides) {
        const guideStyle = styleString({
            position: 'absolute',
            top: `${m.top}mm`,
            right: `${m.right}mm`,
            bottom: `${m.bottom}mm`,
            left: `${m.left}mm`,
        });
        parts.push(`<div class="ex-margin-guide" aria-hidden="true" style="${escapeAttr(guideStyle)}"></div>`);
    }
    if (page.regions.background) {
        const bg = page.regions.background;
        const bgStyle = styleString({
            position: 'absolute',
            inset: '0',
            'z-index': '0',
            'pointer-events': 'none',
            ...bg.style,
        });
        parts.push(`<div class="ex-region ex-region--background" data-region-id="${escapeAttr(bg.id)}" style="${escapeAttr(bgStyle)}">${renderNodes(bg.children, ctx)}</div>`);
    }
    if (options.includePrintChrome !== false && doc.print.enabled) {
        const templateContext = {
            pageIndex,
            totalPages,
            pageLabel: page.label,
            date: options.templateDate ?? doc.meta.updatedAt.slice(0, 10),
            dataContext: ctx.dataContext,
            expressionRuntime: ctx.expressionRuntime,
        };
        for (const position of ['header', 'footer']) {
            const template = doc.print[position];
            if (!template.enabled)
                continue;
            const rendered = renderPrintTemplateHtml(doc, position, templateContext);
            const chromeStyle = styleString({
                position: 'absolute',
                left: `${m.left}mm`,
                right: `${m.right}mm`,
                [position === 'header' ? 'top' : 'bottom']: '0',
                height: `${template.height}mm`,
                display: 'flex',
                'align-items': position === 'header' ? 'flex-end' : 'flex-start',
                'z-index': '30',
                overflow: 'hidden',
            });
            parts.push(`<div class="ex-print-chrome ex-print-chrome--${position}" data-variant="${rendered.variant}" style="${escapeAttr(chromeStyle)}"><div class="ex-print-template ex-print-template--${position}">${rendered.html}</div></div>`);
        }
    }
    const pageNumberHtml = renderPageNumber(page, pageIndex, totalPages);
    const numberIn = page.pageNumbering?.position;
    // Header/footer variants: 'all' renders always; 'first' only on the
    // document's first page; 'odd-even' renders always but tags the region
    // with ex-region--odd / ex-region--even (1-based page parity) so style
    // rules can differentiate (e.g. mirrored book margins).
    const showVariant = (variant) => variant !== 'first' || pageIndex === 0;
    const parityClass = (variant) => variant === 'odd-even' ? ((pageIndex + 1) % 2 === 1 ? ' ex-region--odd' : ' ex-region--even') : '';
    const content = [];
    if (page.regions.header && showVariant(page.headerVariant)) {
        content.push(renderRegion(page.regions.header, `header${parityClass(page.headerVariant)}`, ctx));
    }
    if (numberIn === 'header')
        content.push(pageNumberHtml);
    content.push(renderRegion(page.regions.body, 'body', ctx));
    if (page.regions.footer && showVariant(page.footerVariant)) {
        content.push(renderRegion(page.regions.footer, `footer${parityClass(page.footerVariant)}`, ctx));
    }
    if (numberIn === 'footer')
        content.push(pageNumberHtml);
    parts.push(`<div class="ex-page-content" style="${escapeAttr('position: relative; z-index: 1; display: flex; flex-direction: column; min-height: 100%')}">${content.join('')}</div>`);
    return `<div class="ex-page" data-page-id="${escapeAttr(page.id)}" data-page-index="${pageIndex}" style="${escapeAttr(pageStyle)}">${parts.join('')}</div>`;
}
// --- CSS assembly ---
const RENDERER_AUXILIARY_CSS = `
.ex-margin-guide { border: 1px dashed rgba(37, 99, 235, 0.4); pointer-events: none; z-index: 40; }
.ex-print-chrome { pointer-events: none; width: auto; }
.ex-print-template { width: 100%; }
@media print { .ex-margin-guide { display: none; } }
`.trim();
function buildPageCss(doc, options) {
    const firstPage = doc.pages[0];
    if (!firstPage)
        return '';
    const dims = getPageDimensions(firstPage.size, firstPage.orientation);
    const m = effectivePrintMargins(doc, options.margins ?? firstPage.margins);
    return [
        '@page {',
        `  size: ${dims.width}mm ${dims.height}mm;`,
        `  margin: ${options.printMode ? `${m.top}mm ${m.right}mm ${m.bottom}mm ${m.left}mm` : '0'};`,
        '}',
    ].join('\n');
}
// --- Entry point ---
/** Render a document AST to deterministic HTML + CSS. */
export function render(doc, options = {}) {
    if (options.policy)
        assertDocumentCapabilities(doc, options.policy);
    const runtime = options.runtime ?? legacyRenderRuntime();
    const resolveData = options.resolveData !== false;
    // Static sample data from the document's own sources, overridable per
    // source via options.dataSources.
    const sources = {};
    if (resolveData) {
        for (const source of doc.dataSources) {
            if (source.sampleData && typeof source.sampleData === 'object' && !Array.isArray(source.sampleData)) {
                sources[source.id] = source.sampleData;
            }
        }
        Object.assign(sources, options.dataSources ?? {});
    }
    // Inline template expressions use the same merged sample-data view as the
    // editor. Explicit bindings still resolve against their source first, while
    // host-provided ambient data wins when keys overlap.
    const dataContext = {};
    if (resolveData) {
        for (const sourceData of Object.values(sources))
            Object.assign(dataContext, sourceData);
        Object.assign(dataContext, options.dataContext ?? {});
    }
    const baseCtx = {
        dataContext,
        sources,
        resolveData,
        expressionRuntime: options.expressionRuntime,
        renderers: runtime.renderers,
        transforms: runtime.transforms,
        renderChildren: renderNodes,
    };
    const cssParts = [
        buildPageCss(doc, options),
        DOCUMENT_HTML_RESET_CSS,
        renderDocumentBaseStyles(),
        RENDERER_AUXILIARY_CSS,
        doc.styles.tokens.fonts.length > 0 ? renderFontFaces(doc.styles.tokens) : '',
        renderDesignTokens(doc.styles.tokens),
        renderStyleRules(doc.styles.rules),
        options.includePrintChrome === false ? '' : sanitizePrintTemplateCss(doc.print.css),
        options.extraCss ?? '',
    ];
    const css = cssParts.filter(Boolean).join('\n\n');
    const totalPages = options.totalPages ?? doc.pages.length;
    const pageIndexOffset = options.pageIndexOffset ?? 0;
    const pagesHtml = doc.pages
        .map((page, index) => renderPage(doc, page, index + pageIndexOffset, totalPages, index === doc.pages.length - 1, options, baseCtx))
        .join('\n');
    const html = `<div class="ex-document" data-doc-id="${escapeAttr(doc.id)}">\n${pagesHtml}\n</div>`;
    const fullHtml = [
        '<!DOCTYPE html>',
        '<html lang="en">',
        '<head>',
        '<meta charset="UTF-8" />',
        '<meta name="viewport" content="width=device-width, initial-scale=1.0" />',
        `<title>${escapeAttr(doc.name)}</title>`,
        '<style>',
        css,
        '</style>',
        '</head>',
        '<body>',
        html,
        '</body>',
        '</html>',
    ].join('\n');
    return { html, css, fullHtml };
}
