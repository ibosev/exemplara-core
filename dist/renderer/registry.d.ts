import type { ComponentNode } from '../core/types.js';
import type { BindingTransformRegistry, DataContext, DataSourceMap } from './data.js';
import type { TemplateExpressionRuntime } from '../shared/expression.js';
export interface RenderContext {
    dataContext: DataContext;
    /** Per-source data keyed by DataSource id (bindings resolve against their sourceId). */
    sources: DataSourceMap;
    /** False preserves authored values and prevents all document-data resolution. */
    resolveData: boolean;
    pageIndex: number;
    totalPages: number;
    expressionRuntime?: TemplateExpressionRuntime;
    renderers: RendererRegistry;
    transforms: BindingTransformRegistry;
    /** Render the given nodes to HTML (for renderers that manage their own children, e.g. repeater). */
    renderChildren: (nodes: ComponentNode[], ctx: RenderContext) => string;
}
/** A component renderer converts a (data-resolved) node + pre-rendered children to HTML. */
export type NodeRenderer = (node: ComponentNode, children: string, ctx: RenderContext) => string;
export interface RendererOptions {
    /**
     * When true the pipeline does not pre-render node.children; the renderer
     * calls ctx.renderChildren itself (repeater re-renders per item,
     * conditional may skip children entirely).
     */
    managesChildren?: boolean;
}
export interface RendererEntry {
    render: NodeRenderer;
    managesChildren: boolean;
}
export interface RendererRegistration extends RendererOptions {
    type: string;
    render: NodeRenderer;
}
export interface RendererRegistry {
    register(type: string, render: NodeRenderer, options?: RendererOptions): void;
    unregister(type: string): boolean;
    get(type: string): RendererEntry | undefined;
    registrations(): RendererRegistration[];
}
export declare function createRendererRegistry(initial?: readonly RendererRegistration[]): RendererRegistry;
/** Mutable compatibility registry for the original process-wide API. */
export declare const legacyRendererRegistry: RendererRegistry;
/** @deprecated Prefer an instance returned by `createRenderRuntime()`. */
export declare function registerRenderer(type: string, render: NodeRenderer, options?: RendererOptions): void;
/** @deprecated Prefer an instance returned by `createRenderRuntime()`. */
export declare function unregisterRenderer(type: string): boolean;
/** @deprecated Prefer an instance returned by `createRenderRuntime()`. */
export declare function getRenderer(type: string): RendererEntry | undefined;
