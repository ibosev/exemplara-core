import type { DataBinding, DataSource, ExemplaraDocument } from '../core/types.js';
export type DataValueType = 'string' | 'number' | 'boolean' | 'array' | 'object' | 'null';
export interface SampleDataPath {
    sourceId: string;
    sourceName: string;
    path: string;
    type: DataValueType;
    value: unknown;
    preview: string;
}
export interface SampleDataTreeNode extends SampleDataPath {
    id: string;
    key: string;
    children: SampleDataTreeNode[];
}
export interface DocumentBindingReference extends DataBinding {
    nodeId: string;
    nodeType: string;
    resolved: boolean;
    resolvedValue: unknown;
    preview: string;
}
export declare function sampleDataBySource(sources: readonly DataSource[]): Record<string, Record<string, unknown>>;
export declare function resolveDataPath(value: unknown, path: string): unknown;
/** Turn `company.name` into a label a non-technical operator can read. */
export declare function humanizeDataPath(path: string): string;
export declare function friendlyDataType(type: DataValueType): string;
export declare function formatDataPreview(value: unknown, maxLength?: number): string;
/** Extract selectable paths from every static sample-data source. */
export declare function extractSampleDataPaths(sources: readonly DataSource[], maxDepth?: number): SampleDataPath[];
/** Build an object/array hierarchy suitable for a reusable data-browser tree. */
export declare function buildSampleDataTrees(sources: readonly DataSource[], maxDepth?: number): SampleDataTreeNode[];
/** Collect explicit AST DataBinding records with resolved sample-data previews. */
export declare function collectDocumentBindings(doc: ExemplaraDocument): DocumentBindingReference[];
