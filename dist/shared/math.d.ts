/** CSS reference pixel density: 96px per inch, 25.4mm per inch. */
export declare const MM_PER_INCH = 25.4;
export declare const PX_PER_INCH = 96;
export declare function mmToPx(mm: number): number;
export declare function pxToMm(px: number): number;
export declare function clamp(value: number, min: number, max: number): number;
/** Round to a fixed number of decimal places (avoids float artifacts). */
export declare function roundTo(value: number, decimals?: number): number;
/** Linear interpolation. */
export declare function lerp(a: number, b: number, t: number): number;
/** Snap a zoom factor to sensible steps within [min, max]. */
export declare function stepZoom(current: number, direction: 1 | -1, step?: number, min?: number, max?: number): number;
/** Compute a zoom factor so content of `contentWidth` fits `viewportWidth` with padding. */
export declare function fitZoom(contentWidth: number, viewportWidth: number, padding?: number, max?: number): number;
export declare function toRoman(n: number): string;
/** 1 → a, 2 → b, …, 27 → aa. */
export declare function toAlpha(n: number): string;
export type PageNumberFormat = 'numeric' | 'roman' | 'alpha';
export declare function formatPageNumber(n: number, format?: PageNumberFormat): string;
