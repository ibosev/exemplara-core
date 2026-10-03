import type { BoxSpacing, Orientation, PagePreset, PageSize } from './types.js';
/** Standard page sizes in millimetres (portrait). */
export declare const PAGE_PRESETS: Record<Exclude<PagePreset, 'custom'>, {
    width: number;
    height: number;
}>;
export declare const DEFAULT_MARGINS: BoxSpacing;
/**
 * Resolve effective page dimensions in mm, honouring orientation.
 * For `custom` presets the raw size is used as the portrait base.
 */
export declare function getPageDimensions(size: PageSize, orientation?: Orientation): {
    width: number;
    height: number;
};
