import { pxToMm } from './math.js';

export interface SheetOverflow {
  sheet: number;
  label: string;
  byMm: number;
}

export interface SheetBox {
  scrollHeight: number;
  clientHeight: number;
}

/** Convert sheet element dimensions into stable, UI-independent warnings. */
export function findSheetOverflows(
  sheets: readonly SheetBox[],
  labels: readonly string[],
  tolerancePx = 1,
): SheetOverflow[] {
  return sheets.flatMap((sheet, index) => {
    const overflowPx = sheet.scrollHeight - sheet.clientHeight;
    if (overflowPx <= tolerancePx) return [];
    return [{
      sheet: index + 1,
      label: labels[index] ?? `Page ${index + 1}`,
      byMm: Math.ceil(pxToMm(overflowPx)),
    }];
  });
}
