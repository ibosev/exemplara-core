import { pxToMm } from './math.js';
/** Convert sheet element dimensions into stable, UI-independent warnings. */
export function findSheetOverflows(sheets, labels, tolerancePx = 1) {
    return sheets.flatMap((sheet, index) => {
        const overflowPx = sheet.scrollHeight - sheet.clientHeight;
        if (overflowPx <= tolerancePx)
            return [];
        return [{
                sheet: index + 1,
                label: labels[index] ?? `Page ${index + 1}`,
                byMm: Math.ceil(pxToMm(overflowPx)),
            }];
    });
}
