// ============================================
// Framework-agnostic math utilities.
// No Svelte imports — safe to reuse from any host.
// ============================================

/** CSS reference pixel density: 96px per inch, 25.4mm per inch. */
export const MM_PER_INCH = 25.4;
export const PX_PER_INCH = 96;

export function mmToPx(mm: number): number {
  return (mm / MM_PER_INCH) * PX_PER_INCH;
}

export function pxToMm(px: number): number {
  return (px / PX_PER_INCH) * MM_PER_INCH;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Round to a fixed number of decimal places (avoids float artifacts). */
export function roundTo(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/** Linear interpolation. */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Snap a zoom factor to sensible steps within [min, max]. */
export function stepZoom(current: number, direction: 1 | -1, step = 0.25, min = 0.25, max = 3): number {
  return clamp(roundTo(current + direction * step, 2), min, max);
}

/** Compute a zoom factor so content of `contentWidth` fits `viewportWidth` with padding. */
export function fitZoom(contentWidth: number, viewportWidth: number, padding = 64, max = 1): number {
  if (contentWidth <= 0 || viewportWidth <= 0) return 1;
  return clamp(roundTo((viewportWidth - padding * 2) / contentWidth, 2), 0.1, max);
}

// --- Page number formatting ---

const ROMAN: [number, string][] = [
  [1000, 'm'],
  [900, 'cm'],
  [500, 'd'],
  [400, 'cd'],
  [100, 'c'],
  [90, 'xc'],
  [50, 'l'],
  [40, 'xl'],
  [10, 'x'],
  [9, 'ix'],
  [5, 'v'],
  [4, 'iv'],
  [1, 'i'],
];

export function toRoman(n: number): string {
  if (n <= 0 || !Number.isFinite(n)) return String(n);
  let value = Math.floor(n);
  let out = '';
  for (const [threshold, glyph] of ROMAN) {
    while (value >= threshold) {
      out += glyph;
      value -= threshold;
    }
  }
  return out;
}

/** 1 → a, 2 → b, …, 27 → aa. */
export function toAlpha(n: number): string {
  if (n <= 0 || !Number.isFinite(n)) return String(n);
  let value = Math.floor(n);
  let out = '';
  while (value > 0) {
    value -= 1;
    out = String.fromCharCode(97 + (value % 26)) + out;
    value = Math.floor(value / 26);
  }
  return out;
}

export type PageNumberFormat = 'numeric' | 'roman' | 'alpha';

export function formatPageNumber(n: number, format: PageNumberFormat = 'numeric'): string {
  switch (format) {
    case 'roman':
      return toRoman(n);
    case 'alpha':
      return toAlpha(n);
    default:
      return String(n);
  }
}
