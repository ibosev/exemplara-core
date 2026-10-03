import type { ComponentNode, DataBinding } from '../core/types.js';
import type { DataValueType, SampleDataPath } from './data-browser.js';
export interface TableColumnValue {
    key: string;
    label?: string;
    format?: string;
}
export interface TableDataSelection {
    mode: 'connected' | 'manual' | 'empty';
    binding?: DataBinding;
    path?: SampleDataPath;
    rows: unknown[];
}
export declare function tableColumns(node: ComponentNode): TableColumnValue[];
export declare function tableArrayPaths(paths: readonly SampleDataPath[]): SampleDataPath[];
/** Resolve the canonical table DataBinding or manual rows stored in props. */
export declare function resolveTableDataSelection(node: ComponentNode, paths: readonly SampleDataPath[]): TableDataSelection;
/** Field names seen in representative object rows, in stable source order. */
export declare function tableRowFields(rows: readonly unknown[]): string[];
export declare function replaceBindingTarget(bindings: readonly DataBinding[] | undefined, targetProp: string, replacement?: DataBinding): DataBinding[] | undefined;
/** Choose the safe primary target for the Data panel's point-and-click binding. */
export declare function preferredBindingTarget(nodeType: string, propNames: readonly string[], pathType: DataValueType): string | null;
