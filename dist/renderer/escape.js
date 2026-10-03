export function escapeHtml(value) {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}
export function escapeAttr(value) {
    return value
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}
export function escapeComment(value) {
    return value.replace(/--/g, '- -').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
/** Serialize a style object to a deterministic `k: v; k: v` string. */
export function styleString(style) {
    return Object.entries(style)
        .filter(([, v]) => v !== undefined && v !== '')
        .map(([k, v]) => `${k}: ${v}`)
        .join('; ');
}
