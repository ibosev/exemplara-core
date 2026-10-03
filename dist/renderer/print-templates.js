import { escapeHtml } from './escape.js';
import { resolveSectionTemplate } from '../core/print-sections.js';
import { evaluateTemplateExpression, } from '../shared/expression.js';
import { renderDesignTokens, renderFontFaces } from './styles.js';
const ALLOWED_TAGS = new Set([
    'a', 'b', 'br', 'code', 'div', 'em', 'i', 'img', 'p', 'small', 'span',
    'strong', 'sub', 'sup', 'table', 'tbody', 'td', 'tfoot', 'th', 'thead', 'tr', 'u',
]);
const ALLOWED_ATTRIBUTES = new Set([
    'alt', 'class', 'colspan', 'height', 'href', 'rel', 'rowspan', 'src', 'style',
    'target', 'title', 'width',
]);
function safeUrl(value) {
    return /^(?:https?:|data:image\/|\/|\.\/|\.\.\/|#)/i.test(value.trim());
}
function safeInlineStyle(value) {
    return sanitizePrintTemplateCss(value).trim();
}
/** Sanitize the deliberately small HTML subset accepted by print templates. */
export function sanitizePrintTemplateHtml(html) {
    const styleBlocks = [];
    const styleToken = (index) => `__EXEMPLARA_PRINT_STYLE_${index}__`;
    let output = html
        .replace(/<style\b[^>]*>([\s\S]*?)<\/style\s*>/gi, (_match, css) => {
        const index = styleBlocks.push(sanitizePrintTemplateCss(css)) - 1;
        return styleToken(index);
    })
        .replace(/<(script|iframe|object|embed|form)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '')
        .replace(/<\/?(script|style|iframe|object|embed|form|meta|link)\b[^>]*>/gi, '');
    output = output.replace(/<\/?([a-z][a-z0-9]*)\b([^>]*)>/gi, (match, rawTag, rawAttrs) => {
        const tag = rawTag.toLowerCase();
        if (!ALLOWED_TAGS.has(tag))
            return '';
        if (match.startsWith('</'))
            return `</${tag}>`;
        const attrs = [];
        const attrPattern = /([a-z-]+)\s*=\s*("([^"]*)"|'([^']*)')/gi;
        let attrMatch;
        while ((attrMatch = attrPattern.exec(rawAttrs)) !== null) {
            const name = attrMatch[1].toLowerCase();
            let value = attrMatch[3] ?? attrMatch[4] ?? '';
            if (!ALLOWED_ATTRIBUTES.has(name) || name.startsWith('on'))
                continue;
            if ((name === 'href' || name === 'src') && !safeUrl(value))
                continue;
            if (name === 'style')
                value = safeInlineStyle(value);
            if (!value && name === 'style')
                continue;
            attrs.push(`${name}="${value.replace(/&/g, '&amp;').replace(/"/g, '&quot;')}"`);
        }
        const selfClosing = tag === 'br' || tag === 'img' ? ' /' : '';
        return `<${tag}${attrs.length ? ` ${attrs.join(' ')}` : ''}${selfClosing}>`;
    });
    return output.replace(/__EXEMPLARA_PRINT_STYLE_(\d+)__/g, (_match, rawIndex) => {
        const css = styleBlocks[Number(rawIndex)];
        return css === undefined ? '' : `<style>${css}</style>`;
    });
}
/** Remove CSS constructs that can execute code or break out of the style tag. */
export function sanitizePrintTemplateCss(css) {
    return css
        .replace(/<\/style/gi, '<\\/style')
        .replace(/@import[^;]+;?/gi, '')
        .replace(/expression\s*\([^)]*\)/gi, '')
        .replace(/behavior\s*:[^;}]+;?/gi, '')
        .replace(/url\s*\(\s*(['"]?)\s*javascript:[^)]*\)/gi, 'none');
}
export function resolvePrintTemplateVariant(template, pageIndex) {
    const pageNumber = pageIndex + 1;
    if (pageIndex === 0 && template.variants.first.trim()) {
        return { variant: 'first', html: template.variants.first };
    }
    if (pageNumber % 2 === 1 && template.variants.odd.trim()) {
        return { variant: 'odd', html: template.variants.odd };
    }
    if (pageNumber % 2 === 0 && template.variants.even.trim()) {
        return { variant: 'even', html: template.variants.even };
    }
    return { variant: 'default', html: template.variants.default };
}
function resolveTemplatePlaceholders(template, doc, context) {
    const values = {
        ...(context.dataContext ?? {}),
        document: { title: doc.name },
        page: {
            number: context.pageIndex + 1,
            total: context.totalPages,
            label: context.pageLabel,
        },
        date: context.date,
    };
    return template.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_match, expression) => {
        const value = evaluateTemplateExpression(expression, values, context.expressionRuntime);
        return value === undefined || value === null ? '' : escapeHtml(String(value));
    });
}
export function renderPrintTemplateHtml(doc, position, context) {
    const template = doc.print[position];
    if (!doc.print.enabled || !template.enabled)
        return { html: '', variant: 'default' };
    const resolved = resolveSectionTemplate(doc, position, context.pageIndex);
    return {
        html: sanitizePrintTemplateHtml(context.resolveData === false
            ? resolved.html
            : resolveTemplatePlaceholders(resolved.html, doc, context)),
        variant: resolved.variant,
    };
}
const TEMPLATE_BASE_CSS = `
* { box-sizing: border-box; }
html, body { width: 100%; height: 100%; margin: 0; padding: 0; }
body {
  display: flex;
  width: 100%;
  font-family: var(--font-body-family, Helvetica, Arial, sans-serif);
  font-size: var(--font-body-size, 12px);
  font-weight: var(--font-body-weight, 400);
  line-height: var(--font-body-line-height, 1.5);
  letter-spacing: var(--font-body-letter-spacing, normal);
  color: var(--color-text, #1f2937);
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
body[data-position="header"] { align-items: flex-end; }
body[data-position="footer"] { align-items: flex-start; }
.ex-print-template { width: 100%; overflow: hidden; }
`.trim();
function renderPrintTemplateStyles(doc, css = doc.print.css) {
    return [
        TEMPLATE_BASE_CSS,
        doc.styles.tokens.fonts.length > 0 ? renderFontFaces(doc.styles.tokens) : '',
        renderDesignTokens(doc.styles.tokens),
        sanitizePrintTemplateCss(css),
    ].filter(Boolean).join('\n');
}
function renderTemplateDocumentShell(doc, position, renderedHtml, variant, css) {
    const styles = renderPrintTemplateStyles(doc, css);
    return [
        '<!doctype html><html><head><meta charset="utf-8" />',
        `<style>${styles}</style></head>`,
        `<body data-position="${position}"><div class="ex-print-template ex-print-template--${position}" data-variant="${variant}">${renderedHtml}</div></body></html>`,
    ].join('');
}
/** Standalone source used by editor preview iframes. */
export function renderPrintTemplateDocument(doc, position, context) {
    const rendered = renderPrintTemplateHtml(doc, position, context);
    return renderTemplateDocumentShell(doc, position, rendered.html, rendered.variant, doc.print.css);
}
/** Standalone preview for an unsaved HTML/CSS source draft. */
export function renderPrintTemplateSourceDocument(doc, position, html, css, context, variant = 'default') {
    const renderedHtml = sanitizePrintTemplateHtml(context.resolveData === false
        ? html
        : resolveTemplatePlaceholders(html, doc, context));
    return renderTemplateDocumentShell(doc, position, renderedHtml, variant, css);
}
/** Isolated raw-template document used for direct-on-paper contenteditable sessions. */
export function renderEditablePrintTemplateDocument(doc, position, html) {
    const css = renderPrintTemplateStyles(doc);
    return [
        '<!doctype html><html><head><meta charset="utf-8" />',
        `<style>${css}\n.ex-print-template[contenteditable="true"] { outline:none; cursor:text; min-height:5mm; }</style></head>`,
        `<body data-position="${position}"><div class="ex-print-template ex-print-template--${position}">${sanitizePrintTemplateHtml(html)}</div></body></html>`,
    ].join('');
}
/** HTML passed to Playwright's native Chromium header/footer template API. */
export function renderBrowserPrintTemplate(doc, position, context, horizontalMargins) {
    const rendered = renderPrintTemplateHtml(doc, position, context);
    const css = renderPrintTemplateStyles(doc);
    const height = doc.print[position].height;
    return [
        `<style>${css}</style>`,
        `<div class="ex-browser-template" style="box-sizing:border-box;width:100%;height:${height}mm;overflow:hidden;padding-left:${horizontalMargins.left}mm;padding-right:${horizontalMargins.right}mm">`,
        `<div class="ex-print-template ex-print-template--${position}" data-variant="${rendered.variant}">${rendered.html}</div>`,
        '</div>',
    ].join('');
}
/** Ensure the native browser margin boxes have enough room for the configured templates. */
export function effectivePrintMargins(doc, base) {
    if (!doc.print.enabled)
        return { ...base };
    return {
        ...base,
        top: doc.print.header.enabled ? Math.max(base.top, doc.print.header.height) : base.top,
        bottom: doc.print.footer.enabled ? Math.max(base.bottom, doc.print.footer.height) : base.bottom,
    };
}
