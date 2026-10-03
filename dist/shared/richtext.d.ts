/**
 * Conservative HTML sanitizer for rich text content:
 * - strips <script>/<style>/<iframe> etc. with their contents
 * - removes disallowed tags (keeping their inner text)
 * - drops on* event handlers and javascript: URLs
 * - keeps style/href/target attributes only
 */
export declare function sanitizeHtml(html: string): string;
/** True when a string contains HTML markup. */
export declare function containsMarkup(value: string): boolean;
/** Strip all tags, returning plain text. */
export declare function toPlainText(html: string): string;
export type InlineFormat = 'bold' | 'italic' | 'underline' | 'strikeThrough' | 'removeFormat';
/**
 * Apply an inline format to the current selection inside a contenteditable.
 * Uses execCommand, which remains the pragmatic cross-browser approach for
 * lightweight inline editors.
 */
export declare function applyInlineFormat(format: InlineFormat): void;
/** Query whether an inline format is active at the current selection. */
export declare function isFormatActive(format: Exclude<InlineFormat, 'removeFormat'>): boolean;
