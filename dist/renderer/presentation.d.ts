import type { ComponentNode } from '../core/types.js';
export interface NodePresentation {
    classes: string[];
    style: Record<string, string | number | undefined>;
}
export declare const stringValue: (value: unknown, fallback?: string) => string;
export declare const numberValue: (value: unknown, fallback: number) => number;
/** Merge rule/value bindings over a renderer's built-in presentation. */
export declare function nodePresentation(node: ComponentNode, baseClass: string, style?: Record<string, string | number | undefined>): NodePresentation;
export declare function containerPresentation(node: ComponentNode): NodePresentation;
export declare function columnsPresentation(node: ComponentNode): NodePresentation;
export declare function columnPresentation(ratiosValue: unknown, gapValue: unknown, index: number): NodePresentation;
