import { createId } from '../core/id.js';
export const DEFAULT_PARAGRAPH_FORMATTING = Object.freeze({
    leftIndent: 0,
    rightIndent: 0,
    firstLineIndent: 0,
    spaceBefore: 0,
    spaceAfter: 0,
    lineHeight: 1.5,
    tabStops: [],
});
const round = (value) => Math.round(value * 10) / 10;
const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, Number.isFinite(value) ? value : minimum));
export function resolveParagraphFormatting(node) {
    return {
        ...DEFAULT_PARAGRAPH_FORMATTING,
        ...(node?.paragraph ?? {}),
        tabStops: [...(node?.paragraph?.tabStops ?? [])].sort((a, b) => a.position - b.position),
    };
}
/** Clamp paragraph geometry to the current printable width. */
export function normalizeParagraphFormatting(formatting, contentWidth) {
    const width = Math.max(10, contentWidth);
    const leftIndent = round(clamp(formatting.leftIndent ?? 0, 0, width - 5));
    const rightIndent = round(clamp(formatting.rightIndent ?? 0, 0, width - leftIndent - 5));
    const firstLineIndent = round(clamp(formatting.firstLineIndent ?? 0, -leftIndent, width - leftIndent - rightIndent));
    return {
        leftIndent,
        rightIndent,
        firstLineIndent,
        spaceBefore: round(clamp(formatting.spaceBefore ?? 0, 0, 50)),
        spaceAfter: round(clamp(formatting.spaceAfter ?? 0, 0, 50)),
        lineHeight: Math.round(clamp(formatting.lineHeight ?? 1.5, 0.8, 4) * 100) / 100,
        tabStops: [...(formatting.tabStops ?? [])]
            .map((tab) => ({ ...tab, position: round(clamp(tab.position, 0, width)) }))
            .sort((a, b) => a.position - b.position),
    };
}
export function addParagraphTabStop(formatting, position, alignment, contentWidth) {
    const next = {
        id: createId('tab'),
        position: round(clamp(position, 0, contentWidth)),
        alignment,
    };
    return normalizeParagraphFormatting({ ...formatting, tabStops: [...(formatting.tabStops ?? []), next] }, contentWidth);
}
export function updateParagraphTabStop(formatting, tabId, changes, contentWidth) {
    return normalizeParagraphFormatting({
        ...formatting,
        tabStops: (formatting.tabStops ?? []).map((tab) => tab.id === tabId ? { ...tab, ...changes } : tab),
    }, contentWidth);
}
export function removeParagraphTabStop(formatting, tabId, contentWidth) {
    return normalizeParagraphFormatting({
        ...formatting,
        tabStops: (formatting.tabStops ?? []).filter((tab) => tab.id !== tabId),
    }, contentWidth);
}
export function rulerPercent(position, contentWidth) {
    return contentWidth <= 0 ? 0 : clamp((position / contentWidth) * 100, 0, 100);
}
/** Inline CSS shared by the canvas renderer and final HTML/PDF renderer. */
export function paragraphStyleMap(formatting) {
    if (!formatting)
        return {};
    return {
        'margin-left': formatting.leftIndent ? `${formatting.leftIndent}mm` : undefined,
        'margin-right': formatting.rightIndent ? `${formatting.rightIndent}mm` : undefined,
        'text-indent': formatting.firstLineIndent ? `${formatting.firstLineIndent}mm` : undefined,
        'margin-top': formatting.spaceBefore ? `${formatting.spaceBefore}mm` : undefined,
        'margin-bottom': formatting.spaceAfter ? `${formatting.spaceAfter}mm` : undefined,
        'line-height': formatting.lineHeight ? String(formatting.lineHeight) : undefined,
        'tab-size': formatting.tabStops?.[0]
            ? String(Math.max(1, Math.round(formatting.tabStops[0].position / 2.1)))
            : undefined,
    };
}
