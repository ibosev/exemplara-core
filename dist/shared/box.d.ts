export interface BoxValues {
    top: number;
    right: number;
    bottom: number;
    left: number;
}
export declare const ZERO_BOX: BoxValues;
/** Parse a CSS shorthand ("8px", "4px 8px", …) into per-side values. */
export declare function parseBoxValues(value: string | BoxValues | undefined | null): BoxValues;
/** Format per-side values into the shortest CSS shorthand. */
export declare function formatBoxValues(box: BoxValues, unit?: string): string;
export declare function isZeroBox(box: BoxValues): boolean;
