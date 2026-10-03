export declare function escapeHtml(value: string): string;
export declare function escapeAttr(value: string): string;
export declare function escapeComment(value: string): string;
/** Serialize a style object to a deterministic `k: v; k: v` string. */
export declare function styleString(style: Record<string, string | number | undefined>): string;
