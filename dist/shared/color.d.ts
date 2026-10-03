export interface Rgb {
    r: number;
    g: number;
    b: number;
}
/** Parse #rgb, #rrggbb or rgb(a)() strings. Returns null when unparsable. */
export declare function parseColor(input: string): Rgb | null;
export declare function toHex({ r, g, b }: Rgb): string;
/** WCAG 2.x relative luminance. */
export declare function relativeLuminance({ r, g, b }: Rgb): number;
/** WCAG contrast ratio between two colors (1–21). Null when either is unparsable. */
export declare function contrastRatio(foreground: string, background: string): number | null;
export type WcagLevel = 'AAA' | 'AA' | 'AA-large' | 'fail';
/** Classify a contrast ratio. `largeText` = ≥18pt / ≥14pt bold. */
export declare function wcagLevel(ratio: number, largeText?: boolean): WcagLevel;
/** Whether a color reads as dark (useful for choosing overlay text color). */
export declare function isDark(color: string): boolean;
