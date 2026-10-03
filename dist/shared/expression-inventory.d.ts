import type { ExemplaraDocument } from '../core/types.js';
import { type TemplateExpressionRuntime } from './expression.js';
export interface TemplateExpressionReference {
    id: string;
    kind: 'inline' | 'binding' | 'print';
    nodeId?: string;
    nodeType?: string;
    target: string;
    raw: string;
    expression: string;
    resolved: boolean;
    resolvedValue: unknown;
    preview: string;
}
/** Inventory inline, explicit-binding, and print-chrome expressions with live previews. */
export declare function collectTemplateExpressions(doc: ExemplaraDocument, runtime?: TemplateExpressionRuntime): TemplateExpressionReference[];
