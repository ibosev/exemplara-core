import { isPageBackgroundTokenName } from '../core/custom-css-tokens.js';
import type { DesignTokens, ExemplaraDocument, StyleRule } from '../core/types.js';
import { usesImportedSiteChrome } from '../core/web.js';

/** Standalone-document reset shared by preview, image, and PDF output. */
export const DOCUMENT_HTML_RESET_CSS = `
html, body { margin: 0; padding: 0; }
body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
`.trim();

/**
 * Content CSS used by both the standalone renderer and the interactive canvas.
 * Editor-only selection/drop affordances intentionally live outside this set.
 */
export function renderDocumentBaseStyles(
  rootSelector = '.ex-document',
  pageSelector = `${rootSelector} .ex-page`,
): string {
  return `
${rootSelector} {
  font-family: var(--font-body-family, Helvetica, Arial, sans-serif);
  font-size: var(--font-body-size, 12px);
  font-weight: var(--font-body-weight, 400);
  line-height: var(--font-body-line-height, 1.5);
  letter-spacing: var(--font-body-letter-spacing, normal);
  color: var(--color-text, #1f2937);
}
${rootSelector}, ${rootSelector} *, ${rootSelector} *::before, ${rootSelector} *::after { box-sizing: border-box; }
${pageSelector} { background: var(--color-background, #fff); }
${rootSelector} h1, ${rootSelector} h2, ${rootSelector} h3, ${rootSelector} h4,
${rootSelector} h5, ${rootSelector} h6, ${rootSelector} p, ${rootSelector} blockquote,
${rootSelector} figure, ${rootSelector} figcaption, ${rootSelector} dl, ${rootSelector} dd,
${rootSelector} ul, ${rootSelector} ol { margin: 0; padding: 0; }
${rootSelector} .ex-region--body { flex: 1; }
${rootSelector} .ex-table td, ${rootSelector} .ex-table th { padding: 6px 9px; border: 1px solid var(--color-border, #d7dce3); text-align: left; vertical-align: top; }
${rootSelector} .ex-table th { background: color-mix(in srgb, var(--color-primary, #0f766e) 10%, var(--color-background, #fff)); color: var(--color-primary, #0f766e); font-weight: 700; }
${rootSelector} .ex-table-row--striped { background: color-mix(in srgb, var(--color-primary, #0f766e) 3%, var(--color-background, #fff)); }
${rootSelector} .ex-divider { margin: 0; }
${rootSelector} .ex-image { display: block; max-width: 100%; }
`.trim();
}

/** Emit design tokens as CSS custom properties on :root. */
export function renderDesignTokens(tokens: DesignTokens, selector = ':root'): string {
  const lines: string[] = [`${selector} {`];

  for (const [name, value] of Object.entries(tokens.colors)) {
    lines.push(`  --color-${name}: ${value};`);
    if (name.includes('-')) lines.push(`  --${name}: ${value};`);
    if (isPageBackgroundTokenName(name)) lines.push(`  background-color: ${value};`);
  }
  for (const [name, value] of Object.entries(tokens.spacing)) {
    lines.push(`  --spacing-${name}: ${value};`);
  }
  for (const [name, typo] of Object.entries(tokens.typography)) {
    lines.push(`  --font-${name}-family: ${typo.fontFamily};`);
    lines.push(`  --font-${name}-size: ${typo.fontSize};`);
    lines.push(`  --font-${name}-weight: ${typo.fontWeight};`);
    lines.push(`  --font-${name}-line-height: ${typo.lineHeight};`);
    if (typo.letterSpacing) {
      lines.push(`  --font-${name}-letter-spacing: ${typo.letterSpacing};`);
    }
  }

  lines.push('}');
  return lines.length > 2 ? lines.join('\n') : '';
}

export function renderFontFaces(tokens: DesignTokens): string {
  return tokens.fonts
    .map((font) => {
      const lines = [
        '@font-face {',
        `  font-family: '${font.family}';`,
        `  src: url('${font.src}');`,
      ];
      if (font.weight) lines.push(`  font-weight: ${font.weight};`);
      if (font.style) lines.push(`  font-style: ${font.style};`);
      lines.push('}');
      return lines.join('\n');
    })
    .join('\n\n');
}

function scopedRuleSelector(selector: string, scope: string): string {
  const normalized = selector.trim();
  if (
    !normalized
    || normalized === ':root'
    || normalized === 'html'
    || normalized === 'body'
    || normalized === '.ex-document'
  ) return scope;
  if (normalized.startsWith('body ')) return `${scope} ${normalized.slice('body '.length)}`;
  if (normalized.startsWith('html body ')) return `${scope} ${normalized.slice('html body '.length)}`;
  if (normalized.startsWith('.ex-document ')) return `${scope} ${normalized.slice('.ex-document '.length)}`;
  if (normalized === '.ex-page') return scope;
  if (normalized.startsWith('.ex-page')) return `${scope}${normalized.slice('.ex-page'.length)}`;
  return `${scope} ${normalized}`;
}

export function renderStyleRules(rules: StyleRule[], scope?: string): string {
  return renderStyleRulesForTarget(rules, scope);
}

interface StyleRuleTarget {
  /** Container queries make responsive rules follow the selected editor canvas width. */
  containerName?: string;
}

function containerQuery(mediaQuery: string): string | null {
  const query = mediaQuery
    .trim()
    .replace(/^(?:only\s+)?(?:screen|all)\s+and\s+/i, '')
    .replace(/\s*,\s*/g, ' or ');
  return query.startsWith('(') ? query : null;
}

function scopeLosslessImportedCss(source: string, pageSelector: string): string {
  const responsive = source.replace(/@media\s+([^{}]+)\{/gi, (match, query: string) => {
    const converted = containerQuery(query);
    return converted ? `@container exemplara-page-preview ${converted} {` : match;
  });
  const viewportRelative = responsive.replace(/(-?\d*\.?\d+)vw\b/gi, '$1cqw');
  const rootAdjusted = viewportRelative.replace(
    /(^|[{}])([^{}]+)\{/g,
    (full, boundary: string, selectorSource: string) => {
      if (selectorSource.trim().startsWith('@')) return full;
      const selectors = selectorSource.split(',').map((selector) => {
        const leading = selector.match(/^\s*/)?.[0] ?? '';
        const trailing = selector.match(/\s*$/)?.[0] ?? '';
        let normalized = selector.trim();
        if (normalized === ':root' || normalized === 'html' || normalized === 'body') {
          normalized = ':scope';
        } else {
          normalized = normalized
            .replace(/^html\s+body(?=[.#:\s>+~]|$)/, ':scope')
            .replace(/^body(?=[.#:\s>+~]|$)/, ':scope')
            .replace(/^html(?=[.#:\s>+~]|$)/, ':scope');
        }
        return `${leading}${normalized}${trailing}`;
      });
      return `${boundary}${selectors.join(',')}{`;
    },
  );
  return `@scope (${pageSelector}) {\n${rootAdjusted}\n}`;
}

function renderStyleRulesForTarget(
  rules: StyleRule[],
  scope?: string,
  target: StyleRuleTarget = {},
): string {
  return rules
    .map((rule) => {
      const body = Object.entries(rule.properties)
        .map(([property, value]) => `  ${property}: ${value};`)
        .join('\n');
      const selector = rule.selectors
        .flatMap((value) => value.split(','))
        .map((value) => scope ? scopedRuleSelector(value, scope) : value)
        .map((s) => (rule.state ? `${s}:${rule.state}` : s))
        .join(', ');
      const block = `${selector} {\n${body}\n}`;
      if (!rule.mediaQuery) return block;
      const responsiveQuery = target.containerName ? containerQuery(rule.mediaQuery) : null;
      return responsiveQuery
        ? `@container ${target.containerName} ${responsiveQuery} {\n${block}\n}`
        : `@media ${rule.mediaQuery} {\n${block}\n}`;
    })
    .join('\n\n');
}

/** CSS injected into one editor instance so its paper uses renderer styles. */
export function renderScopedDocumentStyles(
  document: ExemplaraDocument,
  pageSelector: string,
): string {
  const customWebCss = document.meta.medium === 'web'
    ? document.meta.web?.customCss?.trim() ?? ''
    : '';
  const losslessHtml = document.meta.medium === 'web'
    && usesImportedSiteChrome(document.meta.web);
  return [
    document.styles.tokens.fonts.length > 0 ? renderFontFaces(document.styles.tokens) : '',
    losslessHtml ? '' : renderDocumentBaseStyles(pageSelector, pageSelector),
    renderStyleRulesForTarget(
      document.styles.rules,
      pageSelector,
      document.meta.medium === 'web' ? { containerName: 'exemplara-page-preview' } : {},
    ),
    customWebCss
      ? (losslessHtml
          ? scopeLosslessImportedCss(customWebCss, pageSelector)
          : `@scope (${pageSelector}) {\n${customWebCss}\n}`)
      : '',
    // Tokens last so Design-panel colors override hardcoded :root values in imported CSS.
    renderDesignTokens(document.styles.tokens, pageSelector),
  ].filter(Boolean).join('\n\n');
}
