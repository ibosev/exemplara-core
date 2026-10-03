import type { DataBinding } from '../core/types.js';
export declare function cloneDataBindings(bindings?: readonly DataBinding[]): DataBinding[];
export declare function appendDataBinding(bindings: readonly DataBinding[] | undefined, targetProp: string, sourceId?: string): DataBinding[];
export declare function updateDataBinding(bindings: readonly DataBinding[] | undefined, index: number, changes: Partial<DataBinding>): DataBinding[];
export declare function removeDataBinding(bindings: readonly DataBinding[] | undefined, index: number): DataBinding[];
