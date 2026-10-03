import type { ComponentNode, ConditionOperator } from '../core/types.js';
import { type TemplateExpressionRuntime } from '../shared/expression.js';
export type DataContext = Record<string, unknown>;
/** Resolve a dot path ("customer.address.city", supports array indices) against a context. */
export declare function resolvePath(context: unknown, path: string): unknown;
/** Replace `{{path.to.value}}` placeholders in a string with context values. */
export declare function interpolate(template: string, context: DataContext, expressionRuntime?: TemplateExpressionRuntime): string;
export declare function evaluateCondition(context: DataContext, path: string, operator: ConditionOperator, expected?: unknown): boolean;
export type BindingTransform = (value: unknown) => unknown;
export interface BindingTransformRegistry {
    register(name: string, transform: BindingTransform): void;
    unregister(name: string): boolean;
    get(name: string): BindingTransform | undefined;
    entries(): Array<[string, BindingTransform]>;
}
export declare function createBindingTransformRegistry(initial?: readonly [string, BindingTransform][]): BindingTransformRegistry;
/** Mutable compatibility registry for the original process-wide API. */
export declare const legacyBindingTransformRegistry: BindingTransformRegistry;
/** Register a named transform usable via DataBinding.transform. */
export declare function registerTransform(name: string, transform: BindingTransform): void;
export declare function unregisterTransform(name: string): boolean;
export declare function getTransform(name: string): BindingTransform | undefined;
/** Per-source data: maps DataSource id → its resolved data object. */
export type DataSourceMap = Record<string, DataContext>;
/**
 * Return a copy of `node` with data bindings applied to its props and
 * `{{…}}` interpolation performed on string props.
 *
 * A binding resolves against its `sourceId`'s data when that source is
 * present in `sources`; when the source is missing — or the path is not
 * found there — it falls back to the ambient `context` (which includes
 * repeater item scope).
 */
export declare function resolveNodeData(node: ComponentNode, context: DataContext, sources?: DataSourceMap, expressionRuntime?: TemplateExpressionRuntime, transformRegistry?: BindingTransformRegistry): ComponentNode;
