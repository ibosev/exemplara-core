import type { ComponentDefinition, ComponentNode } from '../core/types.js';
import { escapeAttr, escapeHtml, styleString } from './escape.js';
import { evaluateCondition, resolvePath, type DataContext } from './data.js';
import { containerPresentation, nodePresentation, stringValue } from './presentation.js';
import type { RenderContext, RendererRegistry } from './registry.js';

export const WEB_SECTION_TAGS = new Set([
  'div', 'header', 'nav', 'main', 'section', 'article', 'aside', 'footer',
  'figure', 'figcaption', 'ul', 'ol', 'li', 'address', 'a', 'span',
  'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'time', 'small', 'strong', 'em', 'b',
  'blockquote',
]);
const WEB_TAGS = WEB_SECTION_TAGS;
const SAFE_HTML_TAG = /^[a-z][a-z0-9-]*$/;
const FORBIDDEN_HTML_TAGS = new Set([
  'base', 'embed', 'iframe', 'link', 'meta', 'noscript', 'object', 'script', 'style', 'template',
]);
export const LOSSLESS_VOID_TAGS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param',
  'source', 'track', 'wbr',
]);
const SAFE_IMPORTED_ATTRIBUTE = /^(?!on)[a-z_:][a-z0-9_.:-]*$/i;
const EDITOR_IMPORTED_ATTRIBUTES = new Set([
  'data-builder-name', 'data-node-id', 'data-shb-raw-attrs',
]);
const IMPORTED_URL_ATTRIBUTES = new Set([
  'action', 'cite', 'formaction', 'href', 'poster', 'src', 'srcset', 'xlink:href',
]);

function safeImportedUrl(value: string): boolean {
  return !/^\s*(?:javascript|vbscript):/i.test(value)
    && (!/^\s*data:/i.test(value) || /^\s*data:image\/(?:png|jpeg|gif|webp);base64,/i.test(value));
}

export function losslessHtmlTag(node: ComponentNode): string {
  const requested = stringValue(node.props.tagName, 'div').toLowerCase();
  return SAFE_HTML_TAG.test(requested) && !FORBIDDEN_HTML_TAGS.has(requested) ? requested : 'div';
}

/** Sanitized author attributes shared by the string renderer and Svelte canvas. */
export function losslessHtmlAttributes(
  node: ComponentNode,
  useConditionalPreview = false,
): Record<string, string> {
  const result: Record<string, string> = {};
  const attributes = node.props.attributes;
  if (attributes && typeof attributes === 'object' && !Array.isArray(attributes)) {
    for (const [name, rawValue] of Object.entries(attributes)) {
      if (
        !SAFE_IMPORTED_ATTRIBUTE.test(name)
        || EDITOR_IMPORTED_ATTRIBUTES.has(name.toLowerCase())
        || name.toLowerCase().startsWith('data-shb-')
        || rawValue === undefined
        || rawValue === null
      ) continue;
      const value = String(rawValue);
      if (IMPORTED_URL_ATTRIBUTES.has(name.toLowerCase()) && !safeImportedUrl(value)) continue;
      result[name] = value;
    }
  }
  if (useConditionalPreview) {
    const previewAttributes = node.props.previewAttributes;
    if (previewAttributes && typeof previewAttributes === 'object' && !Array.isArray(previewAttributes)) {
      for (const [name, rawValue] of Object.entries(previewAttributes)) {
        if (SAFE_IMPORTED_ATTRIBUTE.test(name) && rawValue !== undefined && rawValue !== null) {
          const value = String(rawValue);
          if (!IMPORTED_URL_ATTRIBUTES.has(name.toLowerCase()) || safeImportedUrl(value)) result[name] = value;
        }
      }
    }
  }
  const className = stringValue(
    useConditionalPreview && node.props.previewClassName ? node.props.previewClassName : node.props.className,
  ).trim();
  const htmlId = stringValue(
    useConditionalPreview && node.props.previewHtmlId ? node.props.previewHtmlId : node.props.htmlId,
  ).trim();
  const inlineStyle = stringValue(
    useConditionalPreview && node.props.previewInlineStyle ? node.props.previewInlineStyle : node.props.inlineStyle,
  ).trim();
  const bindingClasses = (node.styleBindings ?? [])
    .map((binding) => binding.ruleId ? `ex-r-${binding.ruleId}` : '')
    .filter(Boolean);
  const bindingStyle = styleString(Object.fromEntries(
    (node.styleBindings ?? [])
      .filter((binding) => binding.value !== undefined && binding.property)
      .map((binding) => [binding.property, binding.value]),
  ));
  const classes = [className, ...bindingClasses].filter(Boolean).join(' ');
  const styles = [inlineStyle.replace(/;\s*$/, ''), bindingStyle].filter(Boolean).join('; ');
  if (classes) result.class = classes;
  if (htmlId) result.id = htmlId;
  if (styles) result.style = styles;
  return result;
}

export function webSectionTag(node: ComponentNode): string {
  const requested = stringValue(node.props.element, 'section').toLowerCase();
  return WEB_SECTION_TAGS.has(requested) ? requested : 'div';
}

export function webSectionAttributes(
  node: ComponentNode,
  useConditionalPreview = false,
): Record<string, string> {
  const presentation = containerPresentation(node);
  const extra = losslessHtmlAttributes(node, useConditionalPreview);
  const classes = ['ex-web-section', ...presentation.classes];
  if (extra.class) {
    for (const name of extra.class.split(/\s+/)) {
      if (name && !classes.includes(name)) classes.push(name);
    }
  }
  extra.class = classes.join(' ');
  const presentationStyle = styleString(presentation.style);
  if (presentationStyle) {
    extra.style = [extra.style, presentationStyle].filter(Boolean).join('; ');
  }
  return extra;
}

function serializedAttributes(attributes: Record<string, string>): string {
  return Object.entries(attributes)
    .map(([name, value]) => `${name}="${escapeAttr(value)}"`)
    .join(' ');
}

function exportedAttributeBlocks(node: ComponentNode, resolveData: boolean | undefined): string {
  if (resolveData) return '';
  if (!Array.isArray(node.props.attributeBlocks)) return '';
  return node.props.attributeBlocks.filter((value): value is string =>
    typeof value === 'string'
      && !/[<>]/.test(value)
      && !/\bon[a-z0-9_-]*\s*=|(?:javascript|vbscript)\s*:/i.test(value),
  ).join('');
}

function attrs(node: ComponentNode, baseClass: string, style: Record<string, string | number | undefined> = {}): string {
  const presentation = nodePresentation(node, baseClass, style);
  const inline = styleString(presentation.style);
  return `class="${escapeAttr(presentation.classes.join(' '))}" data-node-id="${escapeAttr(node.id)}"${
    inline ? ` style="${escapeAttr(inline)}"` : ''
  }`;
}

function safeHref(value: unknown): string {
  const href = stringValue(value, '#').trim();
  return /^(?:https?:\/\/|mailto:|tel:|\/|#|\{\{)/i.test(href) ? href : '#';
}

export const webSectionDefinition: ComponentDefinition = {
  type: 'web-section',
  label: 'Web section',
  icon: '▦',
  category: 'web',
  traits: ['container', 'layout', 'web'],
  acceptsChildren: true,
  defaultProps: {
    element: 'section',
    direction: 'column',
    gap: 0,
    padding: 48,
    background: '',
    color: '',
    align: 'stretch',
    justify: 'flex-start',
    width: '100%',
    maxWidth: '',
    minHeight: 0,
    wrap: 'nowrap',
    border: '',
    borderRadius: '0px',
    overflow: '',
    position: '',
    className: '',
    htmlId: '',
  },
  propSchema: {
    element: { type: 'enum', label: 'Semantic element', default: 'section', enumValues: [...WEB_TAGS] },
    direction: { type: 'enum', label: 'Direction', default: 'column', enumValues: ['row', 'column'] },
    wrap: { type: 'enum', label: 'Wrap', default: 'nowrap', enumValues: ['nowrap', 'wrap'] },
    gap: { type: 'number', label: 'Gap (px)', default: 0, min: 0, max: 240 },
    padding: { type: 'number', label: 'Padding (px)', default: 48, min: 0, max: 320 },
    width: { type: 'string', label: 'Width', default: '100%' },
    maxWidth: { type: 'string', label: 'Maximum width', default: '' },
    minHeight: { type: 'number', label: 'Minimum height (px)', default: 0, min: 0, max: 3000 },
    background: { type: 'color', label: 'Background', default: '' },
    color: { type: 'color', label: 'Text color', default: '' },
    align: { type: 'enum', label: 'Align items', default: 'stretch', enumValues: ['stretch', 'flex-start', 'center', 'flex-end'] },
    justify: { type: 'enum', label: 'Justify', default: 'flex-start', enumValues: ['flex-start', 'center', 'flex-end', 'space-between', 'space-around'] },
    border: { type: 'string', label: 'Border', default: '' },
    borderRadius: { type: 'string', label: 'Corner radius', default: '0px' },
    overflow: { type: 'enum', label: 'Overflow', default: '', enumValues: ['', 'hidden', 'auto', 'visible'] },
    position: { type: 'enum', label: 'Position', default: '', enumValues: ['', 'relative', 'sticky'] },
    className: { type: 'string', label: 'CSS classes', default: '' },
    htmlId: { type: 'string', label: 'Element ID', default: '' },
  },
};

export const webLinkDefinition: ComponentDefinition = {
  type: 'web-link',
  label: 'Button / link',
  icon: '↗',
  category: 'web',
  traits: ['text', 'web', 'data-bound'],
  defaultProps: {
    label: 'Learn more',
    href: '#',
    appearance: 'primary',
    newTab: false,
    ariaLabel: '',
  },
  propSchema: {
    label: { type: 'string', label: 'Label', default: 'Learn more' },
    href: { type: 'string', label: 'Destination', default: '#' },
    appearance: { type: 'enum', label: 'Appearance', default: 'primary', enumValues: ['primary', 'secondary', 'text'] },
    newTab: { type: 'boolean', label: 'Open in new tab', default: false },
    ariaLabel: { type: 'string', label: 'Accessible label', default: '' },
  },
};

export const losslessHtmlElementDefinition: ComponentDefinition = {
  type: 'html-element',
  label: 'HTML element',
  icon: '◇',
  category: 'web',
  traits: ['container', 'web'],
  acceptsChildren: true,
  defaultProps: {
    tagName: 'div', className: '', htmlId: '', attributes: {}, inlineStyle: '', attributeBlocks: [],
  },
  propSchema: {
    tagName: { type: 'string', label: 'HTML element', default: 'div' },
    className: { type: 'string', label: 'CSS classes', default: '' },
    htmlId: { type: 'string', label: 'Element ID', default: '' },
    attributes: { type: 'object', label: 'Attributes', default: {} },
    inlineStyle: { type: 'string', label: 'Inline CSS', default: '', multiline: true },
    attributeBlocks: {
      type: 'array',
      label: 'Conditional attributes',
      default: [],
      itemSchema: { type: 'string', label: 'Handlebars block', default: '' },
    },
  },
};

export const losslessHtmlTextDefinition: ComponentDefinition = {
  type: 'html-text',
  label: 'Imported text',
  icon: 'T',
  category: 'internal',
  defaultProps: { content: '' },
  propSchema: {
    content: { type: 'string', label: 'Text', default: '' },
  },
};

export const WEB_COMPONENT_DEFINITIONS = [
  webSectionDefinition,
  webLinkDefinition,
  losslessHtmlElementDefinition,
  losslessHtmlTextDefinition,
] as const;

export function registerWebRenderers(registry: RendererRegistry): void {
  registry.register('web-section', (node, children, ctx) => {
    const tag = webSectionTag(node);
    const attributes = webSectionAttributes(node, ctx.resolveData);
    attributes['data-node-id'] = node.id;
    const serialized = serializedAttributes(attributes);
    const attributeBlocks = exportedAttributeBlocks(node, ctx.resolveData);
    return `<${tag}${serialized ? ` ${serialized}` : ''}${attributeBlocks}>${children}</${tag}>`;
  });

  registry.register('web-link', (node, _children, ctx) => {
    const label = stringValue(node.props.label, 'Learn more');
    const appearance = stringValue(node.props.appearance, 'primary');
    const href = safeHref(node.props.href);
    const newTab = node.props.newTab === true;
    const ariaLabel = stringValue(node.props.ariaLabel);
    const nodeAttrs = attrs(node, `ex-web-link ex-web-link--${appearance}`);
    const attributeBlocks = exportedAttributeBlocks(node, ctx.resolveData);
    return `<a ${nodeAttrs} href="${escapeAttr(href)}"${
      ariaLabel ? ` aria-label="${escapeAttr(ariaLabel)}"` : ''
    }${newTab ? ' target="_blank" rel="noopener noreferrer"' : ''}${attributeBlocks}>${escapeHtml(label)}</a>`;
  });

  registry.register('html-element', (node, children, ctx) => {
    const tag = losslessHtmlTag(node);
    const attributes = losslessHtmlAttributes(node, ctx.resolveData);
    const serialized = Object.entries(attributes)
      .map(([name, value]) => `${name}="${escapeAttr(value)}"`)
      .join(' ');
    const attributeBlocks = !ctx.resolveData && Array.isArray(node.props.attributeBlocks)
      ? node.props.attributeBlocks.filter((value): value is string =>
          typeof value === 'string'
            && !/[<>]/.test(value)
            && !/\bon[a-z0-9_-]*\s*=|(?:javascript|vbscript)\s*:/i.test(value),
        ).join('')
      : '';
    return LOSSLESS_VOID_TAGS.has(tag)
      ? `<${tag}${serialized ? ` ${serialized}` : ''}${attributeBlocks} />`
      : `<${tag}${serialized ? ` ${serialized}` : ''}${attributeBlocks}>${children}</${tag}>`;
  });

  registry.register('html-text', (node) => escapeHtml(stringValue(node.props.content)));
}

export function registerHandlebarsControlRenderers(registry: RendererRegistry): void {
  registry.register('repeater', (node, _children, ctx: RenderContext) => {
    const path = stringValue(node.props.path);
    const children = ctx.renderChildren(node.children ?? [], ctx);
    return path ? `{{#each ${path}}}${children}{{/each}}` : children;
  }, { managesChildren: true });
  registry.register('conditional', (node, _children, ctx: RenderContext) => {
    const conditions = Array.isArray(node.props.conditions)
      ? node.props.conditions as Array<{ field?: unknown }>
      : [];
    const field = stringValue(conditions[0]?.field);
    const children = ctx.renderChildren(node.children ?? [], ctx);
    const fallback = ctx.renderChildren(node.slots?.else ?? [], ctx);
    return field
      ? `{{#if ${field}}}${children}${fallback ? `{{else}}${fallback}` : ''}{{/if}}`
      : children;
  }, { managesChildren: true });
}

/** Data-resolved controls for lossless imports. The control itself never adds a DOM wrapper. */
export function registerLosslessControlRenderers(registry: RendererRegistry): void {
  registry.register('repeater', (node, _children, ctx: RenderContext) => {
    if (!ctx.resolveData) return ctx.renderChildren(node.children ?? [], ctx);
    const path = stringValue(node.props.path);
    const resolved = path ? resolvePath(ctx.dataContext, path) : undefined;
    let items: unknown[] = Array.isArray(resolved) ? resolved : [];
    const maxItems = Number(node.props.maxItems) || 0;
    if (maxItems > 0) items = items.slice(0, maxItems);
    return items.map((item, index) => {
      const dataContext: DataContext = {
        ...ctx.dataContext,
        ...(item && typeof item === 'object' && !Array.isArray(item) ? item as DataContext : {}),
        item,
        index,
        count: items.length,
        first: index === 0,
        last: index === items.length - 1,
        '@index': index,
        '@first': index === 0,
        '@last': index === items.length - 1,
      };
      return ctx.renderChildren(node.children ?? [], { ...ctx, dataContext });
    }).join('');
  }, { managesChildren: true });

  registry.register('conditional', (node, _children, ctx: RenderContext) => {
    if (!ctx.resolveData) return ctx.renderChildren(node.children ?? [], ctx);
    const conditions = Array.isArray(node.props.conditions)
      ? node.props.conditions as Array<{ field: string; operator?: string; value?: unknown }>
      : [];
    const logic = stringValue(node.props.conditionLogic, 'and');
    const evaluate = (condition: { field: string; operator?: string; value?: unknown }) =>
      evaluateCondition(
        ctx.dataContext,
        condition.field,
        (condition.operator ?? 'exists') as Parameters<typeof evaluateCondition>[2],
        condition.value,
      );
    const matches = conditions.length === 0 || (logic === 'or'
      ? conditions.some(evaluate)
      : conditions.every(evaluate));
    const visible = matches === (node.props.showWhen !== false);
    return ctx.renderChildren(visible ? node.children ?? [] : node.slots?.else ?? [], ctx);
  }, { managesChildren: true });
}

export const WEB_COMPONENT_CSS = `
.ex-web-section { box-sizing: border-box; }
.ex-web-link {
  display: inline-flex;
  width: fit-content;
  min-height: 42px;
  align-items: center;
  justify-content: center;
  padding: 10px 18px;
  border: 1px solid transparent;
  color: inherit;
  font: inherit;
  font-weight: 700;
  line-height: 1.2;
  text-decoration: none;
}
.ex-web-link--primary { background: var(--color-primary, #f97316); color: var(--color-primary-foreground, #111); }
.ex-web-link--secondary { border-color: var(--color-border, #444); background: transparent; }
.ex-web-link--text {
  display: inline;
  width: auto;
  min-height: 0;
  padding: 0;
  border: 0;
  font-weight: inherit;
  line-height: inherit;
  color: inherit;
  background: transparent;
}
`.trim();
