import { type CapabilityPolicy } from '../core/capabilities.js';
import type { ExemplaraDocument } from '../core/types.js';
import type { DataContext, DataSourceMap } from './data.js';
import { type RenderRuntime } from './runtime.js';
import type { TemplateExpressionRuntime } from '../shared/expression.js';
export interface WebRenderOptions {
    pageIndex?: number;
    dataContext?: DataContext;
    dataSources?: DataSourceMap;
    resolveData?: boolean;
    handlebarsTemplate?: boolean;
    policy?: CapabilityPolicy;
    runtime?: RenderRuntime;
    expressionRuntime?: TemplateExpressionRuntime;
    extraCss?: string;
}
export interface WebRenderResult {
    html: string;
    css: string;
    fullHtml: string;
    pageId: string;
    slug: string;
}
/** Render one route of a web document to static, responsive HTML and CSS. */
export declare function renderWeb(document: ExemplaraDocument, options?: WebRenderOptions): WebRenderResult;
/** Produce publication-safe Handlebars markup while retaining the native AST as editor data. */
export declare function renderWebTemplate(document: ExemplaraDocument, options?: Omit<WebRenderOptions, 'resolveData' | 'handlebarsTemplate'>): WebRenderResult;
