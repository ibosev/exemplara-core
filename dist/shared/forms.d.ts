export type ParseResult<T> = {
    ok: true;
    value: T;
} | {
    ok: false;
    error: string;
};
export declare function parseJsonValue<T = unknown>(raw: string, emptyValue?: T): ParseResult<T>;
export declare function parseJsonRecord(raw: string): ParseResult<Record<string, unknown>>;
/** Import sample data from a file or paste. Objects stay as-is; lists become `{ items: [...] }`. */
export declare function parseImportedSampleData(raw: string): ParseResult<Record<string, unknown>>;
export type SampleFieldType = 'string' | 'number' | 'boolean' | 'json';
export declare function sampleFieldType(value: unknown): SampleFieldType;
export declare function formatSampleFieldValue(value: unknown): string;
export declare function parseSampleFieldValue(raw: string, type: SampleFieldType): ParseResult<unknown>;
export declare function normalizeTokenName(value: string): string;
export declare function parseSelectorList(value: string): string[];
