export type TemplateExpressionEvaluator = (expression: string, context: Record<string, unknown>) => unknown;
export interface TemplateExpressionFormatter {
    name: string;
    label: string;
    category: string;
    description: string;
    example: string;
    /** Preferred authoring form shown by Utils surfaces. Both forms remain safe. */
    usage?: 'pipe' | 'call' | 'both';
    format: (value: unknown, args: unknown[], context: Record<string, unknown>) => unknown;
}
export interface TemplateExpressionRuntime {
    formatters?: readonly TemplateExpressionFormatter[];
    /** Optional host/helper-engine bridge. Return `undefined` to use the portable evaluator. */
    evaluator?: TemplateExpressionEvaluator;
}
export declare const BUILTIN_TEMPLATE_FORMATTERS: readonly TemplateExpressionFormatter[];
/** Split a formatter pipeline or argument list without splitting inside quotes/parentheses. */
export declare function splitExpressionParts(value: string, delimiter?: '|' | ','): string[];
export declare function parseFormatterInvocation(value: string, context: Record<string, unknown>): {
    name: string;
    args: unknown[];
} | null;
/** Evaluate a safe path + formatter pipeline without `eval`. */
export declare function evaluateTemplateExpression(expression: string, context: Record<string, unknown>, runtime?: TemplateExpressionRuntime): unknown;
export declare function interpolateTemplateExpressions(template: string, context: Record<string, unknown>, runtime?: TemplateExpressionRuntime): string;
