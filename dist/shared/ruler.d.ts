import type { ComponentNode, ParagraphFormatting, ParagraphTabStop, TabStopAlignment } from '../core/types.js';
export declare const DEFAULT_PARAGRAPH_FORMATTING: Required<Omit<ParagraphFormatting, 'tabStops'>> & {
    tabStops: ParagraphTabStop[];
};
export declare function resolveParagraphFormatting(node?: ComponentNode | null): Required<ParagraphFormatting>;
/** Clamp paragraph geometry to the current printable width. */
export declare function normalizeParagraphFormatting(formatting: ParagraphFormatting, contentWidth: number): ParagraphFormatting;
export declare function addParagraphTabStop(formatting: ParagraphFormatting, position: number, alignment: TabStopAlignment, contentWidth: number): ParagraphFormatting;
export declare function updateParagraphTabStop(formatting: ParagraphFormatting, tabId: string, changes: Partial<Pick<ParagraphTabStop, 'position' | 'alignment'>>, contentWidth: number): ParagraphFormatting;
export declare function removeParagraphTabStop(formatting: ParagraphFormatting, tabId: string, contentWidth: number): ParagraphFormatting;
export declare function rulerPercent(position: number, contentWidth: number): number;
/** Inline CSS shared by the canvas renderer and final HTML/PDF renderer. */
export declare function paragraphStyleMap(formatting?: ParagraphFormatting): Record<string, string | undefined>;
