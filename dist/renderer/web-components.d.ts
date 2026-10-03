import type { ComponentDefinition, ComponentNode } from '../core/types.js';
import type { RendererRegistry } from './registry.js';
export declare const WEB_SECTION_TAGS: Set<string>;
export declare const LOSSLESS_VOID_TAGS: Set<string>;
export declare function losslessHtmlTag(node: ComponentNode): string;
/** Sanitized author attributes shared by the string renderer and Svelte canvas. */
export declare function losslessHtmlAttributes(node: ComponentNode, useConditionalPreview?: boolean): Record<string, string>;
export declare function webSectionTag(node: ComponentNode): string;
export declare function webSectionAttributes(node: ComponentNode, useConditionalPreview?: boolean): Record<string, string>;
export declare const webSectionDefinition: ComponentDefinition;
export declare const webLinkDefinition: ComponentDefinition;
export declare const losslessHtmlElementDefinition: ComponentDefinition;
export declare const losslessHtmlTextDefinition: ComponentDefinition;
export declare const WEB_COMPONENT_DEFINITIONS: readonly [ComponentDefinition, ComponentDefinition, ComponentDefinition, ComponentDefinition];
export declare function registerWebRenderers(registry: RendererRegistry): void;
export declare function registerHandlebarsControlRenderers(registry: RendererRegistry): void;
/** Data-resolved controls for lossless imports. The control itself never adds a DOM wrapper. */
export declare function registerLosslessControlRenderers(registry: RendererRegistry): void;
export declare const WEB_COMPONENT_CSS: string;
