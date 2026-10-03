// ============================================
// Framework-agnostic rich text utilities.
// sanitizeHtml is regex-based so it also runs in Node (renderer/PDF);
// the exec* helpers require a browser document.
// ============================================

const ALLOWED_TAGS = new Set([
  'b', 'strong', 'i', 'em', 'u', 's', 'strike', 'sub', 'sup',
  'br', 'p', 'div', 'span', 'ul', 'ol', 'li', 'a',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'code', 'pre',
]);

/**
 * Conservative HTML sanitizer for rich text content:
 * - strips <script>/<style>/<iframe> etc. with their contents
 * - removes disallowed tags (keeping their inner text)
 * - drops on* event handlers and javascript: URLs
 * - keeps style/href/target attributes only
 */
export function sanitizeHtml(html: string): string {
  let out = html;

  // Contenteditable surfaces can contain framework-generated comment anchors
  // (for example Svelte boundaries around an {@html} block). They are not
  // authored content and must never be persisted or rendered as text.
  out = out.replace(/<!--[\s\S]*?-->/g, '');

  // Remove dangerous elements together with their content, then any
  // stray unpaired dangerous tags.
  out = out.replace(/<(script|style|iframe|object|embed|form)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '');
  out = out.replace(/<\/?(script|style|iframe|object|embed|form|meta|link)\b[^>]*>/gi, '');

  // Process remaining tags.
  out = out.replace(/<\/?([a-z][a-z0-9]*)\b([^>]*)>/gi, (match, rawTag: string, rawAttrs: string) => {
    const tag = rawTag.toLowerCase();
    if (!ALLOWED_TAGS.has(tag)) return '';
    const isClosing = match.startsWith('</');
    if (isClosing) return `</${tag}>`;

    // Whitelist attributes.
    const attrs: string[] = [];
    const attrPattern = /([a-z-]+)\s*=\s*("([^"]*)"|'([^']*)')/gi;
    let attrMatch: RegExpExecArray | null;
    while ((attrMatch = attrPattern.exec(rawAttrs)) !== null) {
      const name = attrMatch[1]!.toLowerCase();
      const value = attrMatch[3] ?? attrMatch[4] ?? '';
      if (name.startsWith('on')) continue;
      if (name === 'style' || name === 'target') {
        attrs.push(`${name}="${value.replace(/"/g, '&quot;')}"`);
      } else if (name === 'href' && !/^\s*javascript:/i.test(value)) {
        attrs.push(`href="${value.replace(/"/g, '&quot;')}"`);
      }
    }
    const selfClose = tag === 'br' ? ' /' : '';
    return `<${tag}${attrs.length ? ' ' + attrs.join(' ') : ''}${selfClose}>`;
  });

  return out;
}

/** True when a string contains HTML markup. */
export function containsMarkup(value: string): boolean {
  return /<[a-z][\s\S]*>/i.test(value);
}

/** Strip all tags, returning plain text. */
export function toPlainText(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

export type InlineFormat = 'bold' | 'italic' | 'underline' | 'strikeThrough' | 'removeFormat';

/**
 * Apply an inline format to the current selection inside a contenteditable.
 * Uses execCommand, which remains the pragmatic cross-browser approach for
 * lightweight inline editors.
 */
export function applyInlineFormat(format: InlineFormat): void {
  document.execCommand(format, false);
}

/** Query whether an inline format is active at the current selection. */
export function isFormatActive(format: Exclude<InlineFormat, 'removeFormat'>): boolean {
  try {
    return document.queryCommandState(format);
  } catch {
    return false;
  }
}
