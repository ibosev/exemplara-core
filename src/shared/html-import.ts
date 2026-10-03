import {
  derivedPanelToken,
  derivedSurfaceToken,
  harmonizeTemplateThemeCss,
  harmonizeThemeColorValue,
  isDarkColorSample,
  isPageBackgroundTokenName,
  retieBakedRootBackgrounds,
  stripCssCustomProperties,
  themePrefixFromPageToken,
} from '../core/custom-css-tokens.js';
import { createDocument, createNode, createPage } from '../core/create.js';
import { createWebDocument, DEFAULT_WEB_PAGE_SETTINGS } from '../core/web.js';
import type {
  ComponentNode,
  ExemplaraDocument,
  StyleBinding,
  StyleRule,
} from '../core/types.js';
import { sanitizeHtml } from './richtext.js';

export interface HtmlImportOptions {
  documentName?: string;
  css?: string;
  /** Keep absolute HTTPS image sources. Disable for a fully network-isolated import. */
  allowRemoteImages?: boolean;
  /**
   * Treat a single layout wrapper as page-level presentation and import its
   * children as direct body flow blocks. Useful for generated print templates
   * whose tables and rich text must paginate independently.
   */
  promoteSinglePageRoot?: boolean;
  /** Keep all imported blocks on one authored page and let auto-flow paginate them. */
  pageStrategy?: 'auto' | 'single';
  /** Import semantic website nodes, Handlebars preview controls, and route metadata. */
  web?: boolean;
  /**
   * Convert website markup to native web-section/text/link nodes with style
   * rules, instead of lossless html-element clones.
   */
  native?: boolean;
}

export interface HtmlImportResult {
  document: ExemplaraDocument;
  warnings: string[];
}

const SKIPPED_ELEMENTS = new Set([
  'script', 'style', 'object', 'embed', 'link', 'meta', 'base', 'template', 'noscript',
]);

const FORM_CONTROL_ELEMENTS = new Set(['input', 'button', 'select', 'textarea']);
const PAGE_ROOT_ELEMENTS = new Set(['main', 'article']);
const PAGE_SECTION_ELEMENTS = new Set(['section', 'nav', 'header', 'footer', 'aside']);
const PROMOTABLE_PAGE_ROOT_ELEMENTS = new Set(['main', 'article', 'div', 'section']);

interface ImportedPageEntry {
  node: ComponentNode;
  tag: string;
}

const RICH_TEXT_ELEMENTS = new Set([
  'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'pre', 'ul', 'ol',
]);

const NATIVE_WEB_TAGS = new Set([
  'div', 'header', 'nav', 'main', 'section', 'article', 'aside', 'footer',
  'figure', 'figcaption', 'ul', 'ol', 'li', 'address', 'a', 'span',
  'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'time', 'small', 'strong', 'em', 'b',
  'blockquote',
]);

const NATIVE_PHRASING_TAGS = new Set(['span', 'strong', 'em', 'small', 'time', 'b']);
const NATIVE_LIST_TAGS = new Set(['ul', 'ol']);
const WEB_LINK_OWNED_ATTRIBUTES = new Set(['href', 'target', 'aria-label']);

const SAFE_CSS_PROPERTIES = new Set([
  'color', 'background', 'background-color',
  'background-image', 'background-size', 'background-position', 'background-repeat', 'background-attachment',
  'font-family', 'font-size', 'font-style', 'font-weight', 'line-height',
  'letter-spacing', 'text-align', 'text-decoration', 'text-transform', 'white-space',
  'display', 'flex', 'flex-basis', 'flex-direction', 'flex-grow', 'flex-shrink',
  'flex-wrap', 'align-items', 'align-self', 'justify-content',
  'grid', 'grid-template', 'grid-template-columns', 'grid-template-rows',
  'grid-auto-flow', 'grid-auto-columns', 'grid-auto-rows',
  'grid-column', 'grid-row', 'place-content', 'place-items', 'place-self',
  'justify-items', 'justify-self', 'order',
  'gap', 'row-gap', 'column-gap',
  'width', 'min-width', 'max-width', 'height', 'min-height', 'max-height',
  'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
  'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  'border', 'border-width', 'border-style', 'border-color',
  'border-top', 'border-right', 'border-bottom', 'border-left', 'border-radius',
  'opacity', 'overflow', 'object-fit', 'box-shadow', 'vertical-align',
  'aspect-ratio', 'box-sizing', 'list-style', 'list-style-position', 'list-style-type',
  // Print-invoice layouts rely on absolute accents and stacking (logo tiles, masthead rules).
  'position', 'top', 'right', 'bottom', 'left', 'inset', 'z-index',
  'border-collapse',
]);

function safeCssValue(value: string, allowImageUrls = false): boolean {
  if (value.length > 1000 || /[<>\\]/.test(value) || /\/\*|\*\//.test(value)) return false;
  if (/(?:@import|behavior\s*:|expression\s*\(|image-set\s*\(|cross-fade\s*\(|element\s*\(|paint\s*\(|src\s*\()/i.test(value)) return false;

  let remainder = value;
  const urls = Array.from(value.matchAll(/url\(\s*(['"]?)(.*?)\1\s*\)/gi));
  if (urls.length > 0) {
    if (!allowImageUrls) return false;
    for (const match of urls) {
      const url = match[2]?.trim() ?? '';
      if (!/^(?:(?:https:\/\/|data:image\/(?:png|jpeg|gif|webp);base64,|\/|\.\.?\/)[^\s]+|\{\{[A-Za-z_$][A-Za-z0-9_$.-]*\}\})$/i.test(url)) return false;
    }
    remainder = remainder.replace(/url\(\s*(['"]?)(.*?)\1\s*\)/gi, '');
  }
  return !/(?:[a-z][a-z0-9+.-]*\s*:|\/\/|url\s*\(|var\s*\()/i.test(remainder);
}

/** Parse declarations using a deliberately small, network-free CSS subset. */
export function sanitizeImportedDeclarations(source: string, allowImageUrls = false): Record<string, string> {
  const properties: Record<string, string> = {};
  for (const declaration of source.split(';')) {
    const separator = declaration.indexOf(':');
    if (separator < 1) continue;
    const property = declaration.slice(0, separator).trim().toLowerCase();
    const value = declaration.slice(separator + 1).trim();
    const customProperty = /^--[A-Za-z_][A-Za-z0-9_-]*$/.test(property);
    const imageProperty = property === 'background' || property === 'background-image';
    if (customProperty) {
      if (value && value.length <= 1000 && !/[<>\\]/.test(value) && !/(?:@import|behavior\s*:|expression\s*\()/i.test(value)) {
        properties[property] = value;
      }
      continue;
    }
    if (SAFE_CSS_PROPERTIES.has(property) && value && safeCssValue(value, allowImageUrls && imageProperty)) {
      properties[property] = value;
    }
  }
  return properties;
}

function importedRules(
  source: string,
  warnings: string[],
): { rules: StyleRule[]; classRules: Map<string, StyleRule>; rootProperties: Record<string, string> } {
  const rulesByClass = new Map<string, StyleRule>();
  const rootProperties: Record<string, string> = {};
  const cleaned = source.replace(/\/\*[\s\S]*?\*\//g, '');
  if (/@(?:import|font-face|keyframes|media|supports|layer)\b/i.test(cleaned)) {
    warnings.push('CSS at-rules were omitted. Imported CSS cannot load remote resources.');
  }

  // Only accept top-level rules. Balanced at-rule blocks are skipped in full,
  // so nested @media declarations can never become unconditional styles.
  const blocks: Array<{ selectors: string; declarations: string }> = [];
  let cursor = 0;
  while (cursor < cleaned.length) {
    while (cursor < cleaned.length && /\s/.test(cleaned[cursor]!)) cursor++;
    const open = cleaned.indexOf('{', cursor);
    const statement = cleaned.indexOf(';', cursor);
    if (open < 0) break;
    if (statement >= 0 && statement < open) {
      cursor = statement + 1;
      continue;
    }
    const selectors = cleaned.slice(cursor, open).trim();
    let depth = 1;
    let quote = '';
    let close = open + 1;
    for (; close < cleaned.length && depth > 0; close++) {
      const character = cleaned[close]!;
      if (quote) {
        if (character === quote && cleaned[close - 1] !== '\\') quote = '';
        continue;
      }
      if (character === '"' || character === "'") quote = character;
      else if (character === '{') depth++;
      else if (character === '}') depth--;
    }
    if (depth !== 0) break;
    if (selectors && !selectors.startsWith('@')) {
      const declarations = cleaned.slice(open + 1, close - 1);
      if (!declarations.includes('{')) blocks.push({ selectors, declarations });
    }
    cursor = close;
  }

  for (const block of blocks) {
    const properties = sanitizeImportedDeclarations(block.declarations);
    if (Object.keys(properties).length === 0) continue;
    for (const rawSelector of block.selectors.split(',')) {
      const selector = rawSelector.trim();
      if (/^(?:html|body|:root)(?:\.[A-Za-z_][\w-]*)*$/i.test(selector)) {
        Object.assign(rootProperties, properties);
        continue;
      }
      if (selector === '*') continue;
      const classMatch = /^\.([a-z_][a-z0-9_-]*)$/i.exec(selector);
      if (!classMatch) {
        if (selector && !selector.startsWith('@')) {
          warnings.push(`CSS selector “${selector}” was omitted; use a single class selector.`);
        }
        continue;
      }
      const className = classMatch[1]!;
      const existing = rulesByClass.get(className);
      if (existing) {
        Object.assign(existing.properties, properties);
      } else {
        const id = `import-${className.toLowerCase().replace(/[^a-z0-9_-]/g, '-')}-${rulesByClass.size + 1}`;
        rulesByClass.set(className, { id, name: className, selectors: [`.ex-r-${id}`], properties: { ...properties } });
      }
    }
  }
  return { rules: [...rulesByClass.values()], classRules: rulesByClass, rootProperties };
}

function declarationsFor(element: Element, classRules: Map<string, StyleRule>): Record<string, string> {
  const declarations: Record<string, string> = {};
  for (const className of Array.from(element.classList)) {
    Object.assign(declarations, classRules.get(className)?.properties ?? {});
  }
  return Object.assign(
    declarations,
    sanitizeImportedDeclarations(element.getAttribute('style') ?? ''),
  );
}

function onlyLayoutElementChild(element: Element): Element | null {
  const meaningfulChildren = Array.from(element.childNodes).filter((child) =>
    child.nodeType === 1 || (child.nodeType === 3 && !!child.textContent?.trim()),
  );
  if (meaningfulChildren.length !== 1 || meaningfulChildren[0]?.nodeType !== 1) return null;
  const child = meaningfulChildren[0] as Element;
  return PROMOTABLE_PAGE_ROOT_ELEMENTS.has(child.tagName.toLowerCase()) ? child : null;
}

export function groupImportedPageNodes(
  imported: readonly ImportedPageEntry[],
  hasPageRoot: boolean,
  pageStrategy: 'auto' | 'single' = 'auto',
): ComponentNode[][] {
  if (pageStrategy === 'single') return [imported.map((entry) => entry.node)];
  const structuralNodes = imported.filter((entry) => PAGE_SECTION_ELEMENTS.has(entry.tag)).length;
  const splitIntoPages = imported.length >= 2 && (
    hasPageRoot || structuralNodes >= Math.ceil(imported.length * 0.6)
  );
  const groups = splitIntoPages
    ? imported.map((entry) => [entry.node])
    : [imported.map((entry) => entry.node)];
  if (groups.length > 1 && /^(?:nav|header)$/.test(imported[0]?.tag ?? '')) {
    groups[1] = [...groups[0]!, ...groups[1]!];
    groups.shift();
  }
  return groups;
}

function styleBindingsFor(element: Element, classRules: Map<string, StyleRule>): StyleBinding[] {
  const bindings: StyleBinding[] = [];
  for (const className of Array.from(element.classList)) {
    const rule = classRules.get(className);
    if (!rule) continue;
    bindings.push({ property: 'class', ruleId: rule.id });
    // Exemplara's typed component props render as inline defaults. Mirror the
    // imported class declarations as editable value bindings so authored CSS
    // wins over those defaults exactly as it did in the source document.
    for (const [property, value] of Object.entries(rule.properties)) {
      bindings.push({ property, value });
    }
  }
  for (const [property, value] of Object.entries(sanitizeImportedDeclarations(
    element.getAttribute('style') ?? '',
  ))) {
    bindings.push({ property, value });
  }
  return bindings;
}

function applyBindings(
  node: ComponentNode,
  element: Element,
  classRules: Map<string, StyleRule>,
  options: { skipAttributes?: Iterable<string> } = {},
): ComponentNode {
  const attributeBlocks = importedRawAttributeBlocks(element);
  const conditionalNames = attributeNamesInBlocks(attributeBlocks);
  const evaluatedClass = Array.from(element.classList)
    .filter((name) => /^[A-Za-z_][A-Za-z0-9_-]*$/.test(name))
    .join(' ');
  const rawClass = rawImportedAttribute(element, 'class') ?? '';
  const htmlId = (rawImportedAttribute(element, 'id') ?? element.getAttribute('id') ?? '').trim();
  if (conditionalNames.has('class')) {
    node.props.previewClassName = evaluatedClass;
  } else if (rawClass.includes('{{')) {
    node.props.className = rawClass;
    node.props.previewClassName = evaluatedClass;
  } else if (evaluatedClass) {
    node.props.className = evaluatedClass;
  }
  if (!conditionalNames.has('id') && htmlId && !htmlId.includes('{{')) node.props.htmlId = htmlId;
  if (conditionalNames.has('id')) node.props.previewHtmlId = element.getAttribute('id') ?? '';
  if (conditionalNames.has('style')) {
    node.props.previewInlineStyle = element.getAttribute('style') ?? '';
  }
  const skipAttributes = new Set(options.skipAttributes ?? []);
  const attributes = importedRawAttributes(element);
  const previewAttributes: Record<string, string> = {};
  for (const [name, value] of Object.entries(attributes)) {
    if (!value.includes('{{')) continue;
    if (name === 'class' || name === 'id') {
      delete attributes[name];
      continue;
    }
    attributeBlocks.push(`${name}="${value}"`);
    delete attributes[name];
  }
  for (const name of conditionalNames) {
    const value = element.getAttribute(name);
    if (value !== null && name !== 'class' && name !== 'id' && name !== 'style') {
      previewAttributes[name] = value;
    }
    delete attributes[name];
  }
  for (const name of skipAttributes) delete attributes[name];
  if (Object.keys(attributes).length > 0) node.props.attributes = attributes;
  if (Object.keys(previewAttributes).length > 0) node.props.previewAttributes = previewAttributes;
  if (attributeBlocks.length > 0) node.props.attributeBlocks = attributeBlocks;
  const bindings = styleBindingsFor(element, classRules);
  if (bindings.length > 0) node.styleBindings = bindings;
  return node;
}

function hasHandlebarsControl(element: Element): boolean {
  return Boolean(element.querySelector('shb-if, shb-each, shb-branch, shb-each-item'));
}

function rawImportedAttribute(element: Element, name: string): string | null {
  const raw = element.getAttribute('data-shb-raw-attrs');
  if (!raw) return element.getAttribute(name);
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return typeof parsed[name] === 'string' ? parsed[name] : element.getAttribute(name);
  } catch {
    return element.getAttribute(name);
  }
}

function importedRawAttributes(element: Element): Record<string, string> {
  const attributes: Record<string, string> = {};
  for (const attribute of Array.from(element.attributes)) {
    if (
      attribute.name === 'class'
      || attribute.name === 'id'
      || attribute.name === 'style'
      || attribute.name === 'data-shb-raw-attrs'
      || attribute.name === 'data-shb-raw-attribute-blocks'
      || attribute.name === 'data-builder-name'
      || attribute.name.startsWith('data-shb-')
    ) continue;
    attributes[attribute.name] = attribute.value;
  }
  const raw = element.getAttribute('data-shb-raw-attrs');
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      for (const [name, value] of Object.entries(parsed)) {
        if (typeof value === 'string' && !name.toLowerCase().startsWith('on')) attributes[name] = value;
      }
    } catch {
      // Keep the browser-parsed attributes when preview annotations are malformed.
    }
  }
  return attributes;
}

function importedRawAttributeBlocks(element: Element): string[] {
  const raw = element.getAttribute('data-shb-raw-attribute-blocks');
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((value): value is string =>
      typeof value === 'string'
        && !/\bon[a-z0-9_-]*\s*=|(?:javascript|vbscript)\s*:/i.test(value),
    );
  } catch {
    return [];
  }
}

function attributeNamesInBlocks(blocks: readonly string[]): Set<string> {
  const names = new Set<string>();
  for (const block of blocks) {
    for (const match of block.matchAll(/\b([A-Za-z_:][A-Za-z0-9_.:-]*)\s*=/g)) {
      names.add(match[1]!.toLowerCase());
    }
  }
  return names;
}

function inlineStyleText(
  element: Element,
  allowRemoteImages: boolean,
  preserveTemplateExpressions = false,
): string {
  const source = preserveTemplateExpressions
    ? rawImportedAttribute(element, 'style') ?? element.getAttribute('style') ?? ''
    : element.getAttribute('style') ?? '';
  if (preserveTemplateExpressions) {
    return safeLosslessInlineStyle(source);
  }
  return Object.entries(sanitizeImportedDeclarations(source, allowRemoteImages))
    .map(([property, value]) => `${property}: ${value}`)
    .join('; ');
}

function safeLosslessInlineStyle(source: string): string {
  return source.length <= 10_000
    && !/[<>\\]/.test(source)
    && !/(?:javascript|vbscript)\s*:|behavior\s*:|expression\s*\(|@import/i.test(source)
    ? source.trim()
    : '';
}

function losslessElementNode(
  element: Element,
  classRules: Map<string, StyleRule>,
  warnings: string[],
  allowRemoteImages: boolean,
): ComponentNode {
  const attributeBlocks = importedRawAttributeBlocks(element);
  const conditionalNames = attributeNamesInBlocks(attributeBlocks);
  const attributes = importedRawAttributes(element);
  const previewAttributes: Record<string, string> = {};
  for (const name of conditionalNames) {
    const value = element.getAttribute(name);
    if (value !== null && name !== 'class' && name !== 'id' && name !== 'style') {
      previewAttributes[name] = value;
    }
    delete attributes[name];
  }
  return createNode('html-element', {
    tagName: element.tagName.toLowerCase(),
    className: conditionalNames.has('class') ? '' : rawImportedAttribute(element, 'class') ?? '',
    htmlId: conditionalNames.has('id') ? '' : rawImportedAttribute(element, 'id') ?? '',
    attributes,
    inlineStyle: conditionalNames.has('style') ? '' : inlineStyleText(element, allowRemoteImages, true),
    attributeBlocks,
    previewAttributes,
    previewClassName: conditionalNames.has('class') ? element.getAttribute('class') ?? '' : '',
    previewHtmlId: conditionalNames.has('id') ? element.getAttribute('id') ?? '' : '',
    previewInlineStyle: conditionalNames.has('style') ? element.getAttribute('style') ?? '' : '',
  }, convertChildNodes(element, classRules, warnings, allowRemoteImages, true));
}

function safeRichText(element: Element): string {
  const clone = element.cloneNode(true) as Element;
  for (const child of [clone, ...Array.from(clone.querySelectorAll('*'))]) {
    const safeStyle = sanitizeImportedDeclarations(child.getAttribute('style') ?? '');
    for (const attribute of Array.from(child.attributes)) child.removeAttribute(attribute.name);
    const style = Object.entries(safeStyle).map(([key, value]) => `${key}: ${value}`).join('; ');
    if (style) child.setAttribute('style', style);
  }
  return sanitizeHtml(clone.innerHTML).trim();
}

function textNodeFromElement(
  element: Element,
  classRules: Map<string, StyleRule>,
  native = false,
): ComponentNode | null {
  const content = safeRichText(element);
  if (!content && !element.textContent?.trim()) return null;
  if (native) {
    return applyBindings(createNode('text', {
      content: content || element.textContent?.trim() || '',
    }), element, classRules);
  }
  const heading = /^h([1-6])$/.exec(element.tagName.toLowerCase());
  const level = heading ? Number(heading[1]) : 0;
  const fontSize = level ? [0, 32, 24, 20, 18, 16, 14][level] : 12;
  return applyBindings(createNode('text', {
    content: content || element.textContent?.trim() || '',
    fontSize,
    fontWeight: level ? 'bold' : 'normal',
    color: '',
    align: 'left',
  }), element, classRules);
}

function staticControlNode(
  element: Element,
  classRules: Map<string, StyleRule>,
  warnings: string[],
): ComponentNode | null {
  const tag = element.tagName.toLowerCase();
  if (tag === 'input' && (element.getAttribute('type') ?? '').toLowerCase() === 'hidden') return null;
  let content = '';
  if (tag === 'input') {
    const type = (element.getAttribute('type') ?? 'text').toLowerCase();
    const value = element.getAttribute('value') || element.getAttribute('placeholder') || '';
    content = type === 'checkbox' || type === 'radio'
      ? `${element.hasAttribute('checked') ? '☒' : '☐'} ${value}`.trim()
      : value;
  } else if (tag === 'select') {
    content = (element.querySelector('option[selected]') ?? element.querySelector('option'))
      ?.textContent?.trim() ?? '';
  } else {
    content = element.textContent?.trim() || element.getAttribute('placeholder') || '';
  }
  if (!content) content = tag === 'button' ? 'Button' : 'Empty field';
  warnings.push('Interactive form controls were imported as static editable fields; submission behavior was removed.');
  const node = applyBindings(createNode('text', {
    content,
    fontSize: 12,
    fontWeight: 'normal',
    color: '',
    align: 'left',
  }), element, classRules);
  node.styleBindings = [
    { property: 'min-height', value: '32px' },
    { property: 'display', value: 'flex' },
    { property: 'align-items', value: 'center' },
    ...(node.styleBindings ?? []),
  ];
  return node;
}

function embeddedContentPlaceholder(
  element: Element,
  classRules: Map<string, StyleRule>,
  warnings: string[],
): ComponentNode {
  const title = element.getAttribute('title')?.trim() || 'Embedded content';
  warnings.push(`Embedded content “${title}” was replaced with a static placeholder; remote embeds are not loaded.`);
  const node = applyBindings(createNode('text', {
    content: title,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#64748b',
    align: 'center',
  }), element, classRules);
  node.styleBindings = [
    { property: 'display', value: 'flex' },
    { property: 'align-items', value: 'center' },
    { property: 'justify-content', value: 'center' },
    { property: 'background-color', value: '#f1f5f9' },
    ...(node.styleBindings ?? []),
  ];
  return node;
}

const IMPORTED_DATA_PATH_RE = /^[A-Za-z_$][\w$-]*(?:\.[A-Za-z_$][\w$-]*)*$/;
const IMPORTED_SOURCE_ID_RE = /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,119}$/;
const IMPORTED_FORMATTER_RE = /^[A-Za-z_$][\w$]*(?:\(\s*(?:(?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|-?\d+(?:\.\d+)?|true|false|null)(?:\s*,\s*(?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|-?\d+(?:\.\d+)?|true|false|null))*\s*)?\))?$/;

function tableNode(
  element: Element,
  classRules: Map<string, StyleRule>,
  warnings: string[],
): ComponentNode | null {
  const tableRows = Array.from(element.querySelectorAll('tr'));
  if (tableRows.length === 0) return null;
  const cells = tableRows.map((row) =>
    Array.from(row.querySelectorAll('th, td')).map((cell) => cell.textContent?.trim() ?? ''),
  );
  const columnCount = Math.max(0, ...cells.map((row) => row.length));
  if (columnCount === 0) return null;
  const firstRowHasHeaders = tableRows[0]?.querySelector('th') !== null;
  const headings = firstRowHasHeaders ? cells.shift() ?? [] : [];
  const headingCells = firstRowHasHeaders
    ? Array.from(tableRows[0]!.querySelectorAll('th, td'))
    : [];
  const columns = Array.from({ length: columnCount }, (_, index) => ({
    key: IMPORTED_DATA_PATH_RE.test(headingCells[index]?.getAttribute('data-exemplara-key') ?? '')
      ? headingCells[index]!.getAttribute('data-exemplara-key')!
      : `column${index + 1}`,
    label: headings[index] || `Column ${index + 1}`,
    ...(IMPORTED_FORMATTER_RE.test(headingCells[index]?.getAttribute('data-exemplara-format') ?? '')
      ? { format: headingCells[index]!.getAttribute('data-exemplara-format')! }
      : {}),
  }));
  const rows = cells.map((row) => Object.fromEntries(
    columns.map((column, index) => [column.key, row[index] ?? '']),
  ));
  const node = applyBindings(createNode('table', {
    columns,
    rows,
    striped: false,
    showHeader: firstRowHasHeaders,
  }), element, classRules);
  const rowsPath = element.getAttribute('data-exemplara-rows')?.trim() ?? '';
  const sourceId = element.getAttribute('data-exemplara-source')?.trim() ?? '';
  if (rowsPath || sourceId) {
    if (!IMPORTED_DATA_PATH_RE.test(rowsPath) || !IMPORTED_SOURCE_ID_RE.test(sourceId)) {
      warnings.push('A table row binding was omitted because its data path or source id was invalid.');
    } else {
      node.dataBindings = [{
        targetProp: 'rows',
        sourceId,
        path: rowsPath,
        fallback: rows,
      }];
    }
  }
  return node;
}

function numericCssValue(element: Element, property: string, fallback = 0): number {
  const value = sanitizeImportedDeclarations(element.getAttribute('style') ?? '')[property];
  const numeric = value ? Number.parseFloat(value) : Number.NaN;
  return Number.isFinite(numeric) ? numeric : fallback;
}

function directAnnotatedChild(
  element: Element,
  tagName: string,
  attribute?: string,
  value?: string,
): Element | undefined {
  return Array.from(element.children).find((child) =>
    child.tagName.toLowerCase() === tagName
      && (!attribute || child.getAttribute(attribute) === value),
  );
}

/**
 * HTML parsers relocate invalid custom wrappers from <head> into <body>. For
 * example, a Handlebars conditional around a stylesheet link becomes a
 * <shb-if> body node containing only the skipped <link> plus formatting
 * whitespace. The original head shell is preserved separately, so importing
 * that parser artifact would duplicate the conditional on export.
 */
function containsOnlySkippedHeadContent(element: Element): boolean {
  let foundSkippedElement = false;
  for (const child of Array.from(element.childNodes)) {
    if (child.nodeType === 3) {
      if (child.textContent?.trim()) return false;
      continue;
    }
    if (child.nodeType !== 1) continue;
    const tag = (child as Element).tagName.toLowerCase();
    if (!SKIPPED_ELEMENTS.has(tag)) return false;
    foundSkippedElement = true;
  }
  return foundSkippedElement;
}

function convertElement(
  element: Element,
  classRules: Map<string, StyleRule>,
  warnings: string[],
  allowRemoteImages: boolean,
  web: boolean,
  native = false,
): ComponentNode | null {
  const tag = element.tagName.toLowerCase();
  if (web && tag === 'shb-if') {
    const field = element.getAttribute('data-shb-if')?.trim() ?? '';
    const branch = directAnnotatedChild(element, 'shb-branch', 'data-shb-branch', 'truthy');
    const fallbackBranch = directAnnotatedChild(element, 'shb-branch', 'data-shb-branch', 'else');
    const branchContainsOnlySkippedHeadContent = branch
      ? containsOnlySkippedHeadContent(branch)
      : false;
    const fallbackContainsOnlySkippedHeadContent = fallbackBranch
      ? containsOnlySkippedHeadContent(fallbackBranch)
      : false;
    if (
      (branchContainsOnlySkippedHeadContent || fallbackContainsOnlySkippedHeadContent)
      && (!branch || branchContainsOnlySkippedHeadContent)
      && (!fallbackBranch || fallbackContainsOnlySkippedHeadContent)
    ) return null;
    const children = branch
      ? convertChildNodes(branch, classRules, warnings, allowRemoteImages, web, native)
      : [];
    const fallback = fallbackBranch
      ? convertChildNodes(fallbackBranch, classRules, warnings, allowRemoteImages, web, native)
      : [];
    if (!field || (children.length === 0 && fallback.length === 0)) return children[0] ?? fallback[0] ?? null;
    const node = createNode('conditional', {
      conditions: [{ field, operator: 'truthy' }],
      conditionLogic: 'and',
      showWhen: true,
    }, children);
    if (fallback.length > 0) node.slots = { else: fallback };
    return node;
  }
  if (web && tag === 'shb-each') {
    const path = element.getAttribute('data-shb-each')?.trim() ?? '';
    const item = directAnnotatedChild(element, 'shb-each-item');
    const children = item
      ? convertChildNodes(item, classRules, warnings, allowRemoteImages, web, native)
      : [];
    if (!path || children.length === 0) return children[0] ?? null;
    return createNode('repeater', { path, maxItems: 0 }, children);
  }
  if (web && (tag === 'shb-branch' || tag === 'shb-each-item')) {
    const children = convertChildNodes(element, classRules, warnings, allowRemoteImages, web, native);
    return children.length > 0
      ? createNode('web-section', { element: 'div', padding: 0, className: '', htmlId: '' }, children)
      : null;
  }
  if (tag === 'iframe') return embeddedContentPlaceholder(element, classRules, warnings);
  if (SKIPPED_ELEMENTS.has(tag)) return null;
  if (web && !native) return losslessElementNode(element, classRules, warnings, allowRemoteImages);
  if (FORM_CONTROL_ELEMENTS.has(tag)) return staticControlNode(element, classRules, warnings);
  if (
    RICH_TEXT_ELEMENTS.has(tag)
    && !(native && (NATIVE_LIST_TAGS.has(tag) || hasHandlebarsControl(element)))
  ) {
    return textNodeFromElement(element, classRules, native);
  }
  if (native && NATIVE_PHRASING_TAGS.has(tag) && element.children.length === 0) {
    return textNodeFromElement(element, classRules, true);
  }
  if (tag === 'hr') return applyBindings(createNode('divider', {
    thickness: 1, color: '#cccccc', style: 'solid',
  }), element, classRules);
  if (tag === 'table') return tableNode(element, classRules, warnings);
  if (tag === 'img') {
    const source = rawImportedAttribute(element, 'src') ?? '';
    const embedded = /^data:image\/(?:png|jpeg|gif|webp);base64,/i.test(source);
    const remote = /^https:\/\/[^\s]+$/i.test(source);
    const templateExpression = source.includes('{{');
    if (!embedded && !templateExpression && !(allowRemoteImages && remote)) {
      warnings.push(`Image “${element.getAttribute('alt') || 'untitled'}” was omitted; use embedded image data or an absolute HTTPS URL.`);
      return null;
    }
    if (remote) {
      warnings.push(`Remote image “${element.getAttribute('alt') || 'untitled'}” was retained and will load from its HTTPS source.`);
    }
    return applyBindings(createNode('image', {
      src: source,
      alt: rawImportedAttribute(element, 'alt') ?? '',
      width: element.getAttribute('width') ?? '',
      height: element.getAttribute('height') ?? '',
      objectFit: 'contain',
    }), element, classRules);
  }

  const rawClass = rawImportedAttribute(element, 'class') ?? '';
  if (web && tag === 'a' && !(native && (
    element.children.length > 0
    || hasHandlebarsControl(element)
    || rawClass.includes('{{#')
  ))) {
    return applyBindings(createNode('web-link', {
      label: element.textContent?.trim() || 'Link',
      href: rawImportedAttribute(element, 'href') ?? '#',
      appearance: 'text',
      newTab: element.getAttribute('target') === '_blank',
      ariaLabel: element.getAttribute('aria-label') ?? '',
    }), element, classRules, { skipAttributes: WEB_LINK_OWNED_ATTRIBUTES });
  }

  const children = convertChildNodes(element, classRules, warnings, allowRemoteImages, web, native);
  const inline = sanitizeImportedDeclarations(element.getAttribute('style') ?? '', allowRemoteImages);
  // Keep empty decorative boxes (logo tiles, accent bars) when they carry layout styles,
  // classes, or Handlebars-backed attributes. Drop only truly empty markup.
  if (children.length === 0 && Object.keys(inline).length === 0) {
    const hasIdentity = Boolean(
      element.classList.length
      || element.id
      || (element.getAttribute('style') ?? '').trim()
      || element.getAttribute('data-shb-raw-attrs')
      || element.getAttribute('data-shb-raw-attribute-blocks')
    );
    if (!hasIdentity) return null;
  }
  const semanticTag = NATIVE_WEB_TAGS.has(tag) ? tag : 'div';
  const flexDirection = flexDirectionFromInline(inline);
  const padding = numericCssValue(element, 'padding');
  const gap = numericCssValue(element, 'gap');
  return applyBindings(createNode(web ? 'web-section' : 'container', {
    ...(web ? { element: semanticTag } : {}),
    ...(flexDirection ? { direction: flexDirection } : {}),
    ...(gap ? { gap } : {}),
    ...(padding ? { padding } : {}),
    background: inline['background-color'] ?? inline.background ?? '',
    ...(inline['align-items'] ? { align: inline['align-items'] } : {}),
    ...(inline['justify-content'] ? { justify: inline['justify-content'] } : {}),
  }, children), element, classRules);
}

/** CSS default for display:flex is row; only explicit column* becomes column. */
function flexDirectionFromInline(inline: Record<string, string>): 'row' | 'column' | undefined {
  const explicit = (inline['flex-direction'] ?? '').toLowerCase();
  if (explicit === 'column' || explicit === 'column-reverse') return 'column';
  if (explicit === 'row' || explicit === 'row-reverse') return 'row';
  const display = (inline.display ?? '').toLowerCase();
  if (display === 'flex' || display === 'inline-flex') return 'row';
  return undefined;
}

function convertChildNodes(
  element: Element,
  classRules: Map<string, StyleRule>,
  warnings: string[],
  allowRemoteImages: boolean,
  web: boolean,
  native = false,
): ComponentNode[] {
  const children: ComponentNode[] = [];
  for (const child of Array.from(element.childNodes)) {
    if (child.nodeType === 3 && child.textContent) {
      const content = web && !native ? child.textContent : child.textContent.trim();
      if (!content) continue;
      children.push(createNode(web && !native ? 'html-text' : 'text', { content }));
    } else if (child.nodeType === 1) {
      const converted = convertElement(child as Element, classRules, warnings, allowRemoteImages, web, native);
      if (converted) children.push(converted);
    }
  }
  return children;
}

/** Convert untrusted HTML/CSS into the Exemplara AST; raw markup is never retained. */
export function importHtmlCss(markup: string, options: HtmlImportOptions = {}): HtmlImportResult {
  if (typeof DOMParser === 'undefined') {
    throw new Error('HTML import is only available in a browser.');
  }
  if (!markup.trim()) throw new Error('Paste or select an HTML document to import.');

  const parsed = new DOMParser().parseFromString(markup, 'text/html');
  const warnings: string[] = [];
  const embeddedCss = Array.from(parsed.querySelectorAll('style'))
    .map((style) => style.textContent ?? '')
    .join('\n');
  const { rules, classRules, rootProperties } = importedRules(
    `${embeddedCss}\n${options.css ?? ''}`,
    warnings,
  );
  const documentName = options.documentName?.trim() || parsed.title.trim() || 'Imported document';
  const document = options.web
    ? createWebDocument({ name: documentName })
    : createDocument({ name: documentName, withInitialPage: false });
  if (options.web) {
    document.pages = [];
    if (document.meta.web) {
      document.meta.web.customCss = `${embeddedCss}\n${options.css ?? ''}`.trim();
      document.meta.web.importMode = options.native ? 'native' : 'lossless-html';
    }
  }
  document.print.header.enabled = false;
  document.print.footer.enabled = false;
  const bodyElements = Array.from(parsed.body.children);
  const declaredPageRoot = bodyElements.length === 1 && PAGE_ROOT_ELEMENTS.has(bodyElements[0]!.tagName.toLowerCase())
    ? bodyElements[0]!
    : parsed.body;
  const pageStyleElements: Element[] = declaredPageRoot === parsed.body ? [] : [declaredPageRoot];
  let pageRoot = declaredPageRoot;
  if (options.promoteSinglePageRoot) {
    let promoted = onlyLayoutElementChild(pageRoot);
    while (promoted) {
      pageRoot = promoted;
      pageStyleElements.push(promoted);
      promoted = onlyLayoutElementChild(pageRoot);
    }
  }
  const pageRootStyles = {
    ...Object.fromEntries(Object.entries(rootProperties).filter(([property]) => !property.startsWith('--'))),
    ...declarationsFor(parsed.body, classRules),
    ...Object.assign({}, ...pageStyleElements.map((element) => declarationsFor(element, classRules))),
  };
  const imported: ImportedPageEntry[] = [];
  for (const child of Array.from(pageRoot.childNodes)) {
    if (child.nodeType === 3 && child.textContent) {
      const content = options.web && !options.native ? child.textContent : child.textContent.trim();
      if (!content) continue;
      imported.push({
        node: createNode(options.web && !options.native ? 'html-text' : 'text', { content }),
        tag: 'text',
      });
    } else if (child.nodeType === 1) {
      const converted = convertElement(
        child as Element,
        classRules,
        warnings,
        options.allowRemoteImages !== false,
        options.web === true,
        options.native === true,
      );
      if (converted) imported.push({ node: converted, tag: (child as Element).tagName.toLowerCase() });
    }
  }
  if (imported.length === 0) {
    throw new Error('No supported document content was found in the HTML.');
  }

  // A long web-page wrapper must not become one indivisible A4 block. Import
  // its direct children as explicit sheets; keep a leading nav/header with the
  // hero that follows it. Small fragments still remain a conventional page.
  const groups = groupImportedPageNodes(
    imported,
    pageRoot !== parsed.body,
    options.pageStrategy,
  );
  groups.forEach((children, index) => {
    const page = createPage({
      label: options.web ? (index === 0 ? 'Home' : `Route ${index + 1}`) : `Page ${index + 1}`,
      margins: { top: 0, right: 0, bottom: 0, left: 0 },
    });
    if (options.web) {
      page.web = {
        ...DEFAULT_WEB_PAGE_SETTINGS,
        title: index === 0 ? documentName : `${documentName} ${index + 1}`,
        slug: index === 0 ? '' : `route-${index + 1}`,
        className: Array.from(parsed.body.classList)
          .filter((name) => /^[A-Za-z_][A-Za-z0-9_-]*$/.test(name))
          .join(' '),
        htmlId: parsed.body.id.trim() || undefined,
        inlineStyle: options.web
          ? stripCssCustomProperties(safeLosslessInlineStyle(parsed.body.getAttribute('style') ?? '')) || undefined
          : inlineStyleText(parsed.body, options.allowRemoteImages !== false) || undefined,
      };
    }
    if (Object.keys(pageRootStyles).length > 0) page.regions.body.style = { ...pageRootStyles };
    page.regions.body.children.push(...children);
    document.pages.push(page);
  });
  document.styles.rules.push(...rules);
  bindImportedCssToDesignTokens(document);
  return { document, warnings: Array.from(new Set(warnings)) };
}

const DEFAULT_COLOR_TOKEN_NAMES = new Set(['primary', 'text', 'muted', 'background', 'border']);

function tokenNameFromCssVar(cssVar: string): string {
  return cssVar.replace(/^--/, '').toLowerCase();
}

function classifyImportedCssVariable(cssVar: string, value: string): 'color' | 'bound-color' | 'heading-font' | 'body-font' | 'font-size' | 'skip' {
  const trimmed = value.trim();
  if (!trimmed) return 'skip';
  const name = cssVar.toLowerCase();
  if (name.includes('font-heading') || (name.includes('font') && name.includes('head'))) return 'heading-font';
  if (name.includes('font-body') || (name.includes('font') && name.includes('body'))) return 'body-font';
  if (name.includes('font-size') || name.endsWith('-size') && name.includes('font')) return 'font-size';
  if (/^#([0-9a-f]{3,8})$/i.test(trimmed) || /^(?:rgba?|hsla?)\(/i.test(trimmed)) return 'color';
  if (/^var\(--color-[A-Za-z0-9_-]+\)\s*$/i.test(trimmed)) return 'bound-color';
  return 'skip';
}

function rewriteCssVariableAssignment(css: string, cssVar: string, tokenVar: string): string {
  const escaped = cssVar.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return css.replace(
    new RegExp(`(${escaped}\\s*:\\s*)([^;}]+)`, 'gi'),
    (full, prefix: string, value: string) => (
      value.trim().toLowerCase().startsWith('var(') ? full : `${prefix}var(${tokenVar})`
    ),
  );
}

/**
 * Point imported template CSS variables (`--mujo-bg`, `--quay-page`, …) at the
 * Document design system so the Design panel actually restyles the page.
 */
export function bindImportedCssToDesignTokens(document: ExemplaraDocument): boolean {
  if (document.meta.medium !== 'web') return false;
  const css = document.meta.web?.customCss;
  if (!css?.trim()) return false;

  const rootProperties = importedRules(css, []).rootProperties;
  const tokens = document.styles.tokens;
  const nextColors: Record<string, string> = { ...tokens.colors };
  let nextCss = css;
  let headingFont: string | undefined;
  let bodyFont: string | undefined;
  let bodySize: string | undefined;
  let extractedColor = false;
  let changed = false;

  for (const [cssVar, rawValue] of Object.entries(rootProperties)) {
    if (!cssVar.startsWith('--')) continue;
    const value = rawValue.trim();
    const kind = classifyImportedCssVariable(cssVar, value);
    if (kind === 'skip') continue;
    const tokenName = tokenNameFromCssVar(cssVar);

    if (kind === 'color') {
      nextColors[tokenName] = value;
      extractedColor = true;
      const rewritten = rewriteCssVariableAssignment(nextCss, cssVar, `--color-${tokenName}`);
      if (rewritten !== nextCss) {
        nextCss = rewritten;
        changed = true;
      }
    } else if (kind === 'bound-color') {
      extractedColor = true;
      if (!(tokenName in nextColors)) {
        nextColors[tokenName] = tokens.colors[tokenName] ?? '#888888';
      }
    } else if (kind === 'heading-font') {
      headingFont = /^var\(/i.test(value) ? tokens.typography.heading?.fontFamily : value;
      const rewritten = rewriteCssVariableAssignment(nextCss, cssVar, '--font-heading-family');
      if (rewritten !== nextCss) {
        nextCss = rewritten;
        changed = true;
      }
    } else if (kind === 'body-font') {
      bodyFont = /^var\(/i.test(value) ? tokens.typography.body?.fontFamily : value;
      const rewritten = rewriteCssVariableAssignment(nextCss, cssVar, '--font-body-family');
      if (rewritten !== nextCss) {
        nextCss = rewritten;
        changed = true;
      }
    } else if (kind === 'font-size') {
      bodySize = /^var\(/i.test(value) ? tokens.typography.body?.fontSize : value;
      const rewritten = rewriteCssVariableAssignment(nextCss, cssVar, '--font-body-size');
      if (rewritten !== nextCss) {
        nextCss = rewritten;
        changed = true;
      }
    }
  }

  for (const [name, value] of Object.entries(nextColors)) {
    if (!isPageBackgroundTokenName(name)) continue;
    if (!Object.prototype.hasOwnProperty.call(rootProperties, `--${name}`)) continue;
    const retied = retieBakedRootBackgrounds(nextCss, `--${name}`, `--color-${name}`, value);
    if (retied !== nextCss) {
      nextCss = retied;
      changed = true;
    }
  }

  if (extractedColor) {
    const boundColors: Record<string, string> = {};
    for (const [name, value] of Object.entries(nextColors)) {
      if (!DEFAULT_COLOR_TOKEN_NAMES.has(name) || Object.prototype.hasOwnProperty.call(rootProperties, `--${name}`)) {
        boundColors[name] = value;
      }
    }
    const currentColorNames = Object.keys(tokens.colors);
    const nextColorNames = Object.keys(boundColors);
    const colorsChanged = nextColorNames.length !== currentColorNames.length
      || nextColorNames.some((name) => tokens.colors[name] !== boundColors[name]);
    if (colorsChanged) {
      tokens.colors = Object.keys(boundColors).length ? boundColors : nextColors;
      changed = true;
    }
  }

  const prefixes = new Set(
    Object.keys(tokens.colors)
      .map((name) => themePrefixFromPageToken(name))
      .filter((prefix): prefix is string => Boolean(prefix)),
  );
  for (const prefix of prefixes) {
    const bgName = Object.keys(tokens.colors).find((name) => themePrefixFromPageToken(name) === prefix);
    const bgValue = bgName ? tokens.colors[bgName] : undefined;
    if (bgValue && isDarkColorSample(bgValue) === false) continue;
    if (tokens.colors[`${prefix}-surface`]) {
      const derived = derivedSurfaceToken(prefix);
      if (tokens.colors[`${prefix}-surface`] !== derived) {
        tokens.colors[`${prefix}-surface`] = derived;
        changed = true;
      }
    }
    if (tokens.colors[`${prefix}-panel`]) {
      const derived = derivedPanelToken(prefix);
      if (tokens.colors[`${prefix}-panel`] !== derived) {
        tokens.colors[`${prefix}-panel`] = derived;
        changed = true;
      }
    }
    const harmonized = harmonizeTemplateThemeCss(nextCss, prefix);
    if (harmonized !== nextCss) {
      nextCss = harmonized;
      changed = true;
    }
    for (const rule of document.styles.rules) {
      for (const [property, value] of Object.entries(rule.properties)) {
        const nextValue = harmonizeThemeColorValue(value, prefix);
        if (nextValue !== value) {
          rule.properties[property] = nextValue;
          changed = true;
        }
      }
    }
  }

  if (headingFont && tokens.typography.heading && tokens.typography.heading.fontFamily !== headingFont) {
    tokens.typography.heading = { ...tokens.typography.heading, fontFamily: headingFont };
    changed = true;
  }
  if (bodyFont && tokens.typography.body && tokens.typography.body.fontFamily !== bodyFont) {
    tokens.typography.body = { ...tokens.typography.body, fontFamily: bodyFont };
    changed = true;
  }
  if (bodySize && tokens.typography.body && tokens.typography.body.fontSize !== bodySize) {
    tokens.typography.body = { ...tokens.typography.body, fontSize: bodySize };
    changed = true;
  }

  if (nextCss !== css && document.meta.web) {
    document.meta.web.customCss = nextCss;
    changed = true;
  }

  for (const page of document.pages) {
    const inlineStyle = page.web?.inlineStyle;
    if (inlineStyle) {
      const stripped = stripCssCustomProperties(inlineStyle);
      if (stripped !== inlineStyle) {
        page.web!.inlineStyle = stripped || undefined;
        changed = true;
      }
    }
    const regionStyle = page.regions.body.style;
    if (regionStyle) {
      let removed = false;
      for (const property of Object.keys(regionStyle)) {
        if (property.startsWith('--')) {
          delete regionStyle[property];
          removed = true;
        }
      }
      if (removed) changed = true;
    }
  }

  return changed;
}
