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
export declare function findSheetOverflows(sheets: readonly SheetBox[], labels: readonly string[], tolerancePx?: number): SheetOverflow[];
