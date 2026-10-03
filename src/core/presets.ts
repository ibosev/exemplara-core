import type { BoxSpacing, Orientation, PagePreset, PageSize } from './types.js';

/** Standard page sizes in millimetres (portrait). */
export const PAGE_PRESETS: Record<Exclude<PagePreset, 'custom'>, { width: number; height: number }> = {
  A3: { width: 297, height: 420 },
  A4: { width: 210, height: 297 },
  A5: { width: 148, height: 210 },
  Letter: { width: 215.9, height: 279.4 },
  Legal: { width: 215.9, height: 355.6 },
};

export const DEFAULT_MARGINS: BoxSpacing = { top: 20, right: 20, bottom: 20, left: 20 };

/**
 * Resolve effective page dimensions in mm, honouring orientation.
 * For `custom` presets the raw size is used as the portrait base.
 */
export function getPageDimensions(
  size: PageSize,
  orientation: Orientation = 'portrait',
): { width: number; height: number } {
  const base =
    size.preset && size.preset !== 'custom'
      ? PAGE_PRESETS[size.preset]
      : { width: size.width, height: size.height };

  if (orientation === 'landscape') {
    return {
      width: Math.max(base.width, base.height),
      height: Math.min(base.width, base.height),
    };
  }
  return {
    width: Math.min(base.width, base.height),
    height: Math.max(base.width, base.height),
  };
}
