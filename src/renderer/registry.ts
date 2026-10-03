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

export function createRendererRegistry(
  initial: readonly RendererRegistration[] = [],
): RendererRegistry {
  const renderers = new Map<string, RendererEntry>();
  const registry: RendererRegistry = {
    register(type, render, options = {}) {
      renderers.set(type, { render, managesChildren: options.managesChildren ?? false });
    },
    unregister: (type) => renderers.delete(type),
    get: (type) => renderers.get(type),
    registrations: () => [...renderers.entries()].map(([type, entry]) => ({
      type,
      render: entry.render,
      managesChildren: entry.managesChildren,
    })),
  };
  for (const entry of initial) registry.register(entry.type, entry.render, entry);
  return registry;
}

/** Mutable compatibility registry for the original process-wide API. */
export const legacyRendererRegistry = createRendererRegistry();

/** @deprecated Prefer an instance returned by `createRenderRuntime()`. */
export function registerRenderer(type: string, render: NodeRenderer, options: RendererOptions = {}): void {
  legacyRendererRegistry.register(type, render, options);
}

/** @deprecated Prefer an instance returned by `createRenderRuntime()`. */
export function unregisterRenderer(type: string): boolean {
  return legacyRendererRegistry.unregister(type);
}

/** @deprecated Prefer an instance returned by `createRenderRuntime()`. */
export function getRenderer(type: string): RendererEntry | undefined {
  return legacyRendererRegistry.get(type);
}
