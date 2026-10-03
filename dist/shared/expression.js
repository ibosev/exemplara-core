import { resolveDataPath } from './data-browser.js';
function valueMissing(value) {
    return value === undefined || value === null || value === '';
}
export const BUILTIN_TEMPLATE_FORMATTERS = [
    {
        name: 'uppercase',
        label: 'Uppercase',
        category: 'Text',
        description: 'Convert text to uppercase.',
        example: '{{customer.name | uppercase}}',
        format: (value) => String(value ?? '').toUpperCase(),
    },
    {
        name: 'lowercase',
        label: 'Lowercase',
        category: 'Text',
        description: 'Convert text to lowercase.',
        example: '{{customer.email | lowercase}}',
        format: (value) => String(value ?? '').toLowerCase(),
    },
    {
        name: 'capitalize',
        label: 'Capitalize',
        category: 'Text',
        description: 'Uppercase the first character.',
        example: '{{invoice.status | capitalize}}',
        format: (value) => {
            const text = String(value ?? '');
            return text.charAt(0).toUpperCase() + text.slice(1);
        },
    },
    {
        name: 'number',
        label: 'Number',
        category: 'Numbers',
        description: 'Format a numeric value with locale grouping.',
        example: '{{invoice.quantity | number("en-GB")}}',
        format: (value, args) => {
            const number = Number(value);
            return Number.isFinite(number)
                ? new Intl.NumberFormat(String(args[0] ?? 'en-GB')).format(number)
                : value;
        },
    },
    {
        name: 'currency',
        label: 'Currency',
        category: 'Numbers',
        description: 'Format a number as a currency amount.',
        example: '{{invoice.totalValue | currency("EUR")}}',
        format: (value, args) => {
            const number = Number(value);
            if (!Number.isFinite(number))
                return value;
            const currency = String(args[0] ?? 'EUR');
            const locale = String(args[1] ?? 'en-GB');
            return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(number);
        },
    },
    {
        name: 'percent',
        label: 'Percent',
        category: 'Numbers',
        description: 'Format a decimal value as a percentage.',
        example: '{{invoice.taxRate | percent}}',
        format: (value, args) => {
            const number = Number(value);
            return Number.isFinite(number)
                ? new Intl.NumberFormat(String(args[0] ?? 'en-GB'), { style: 'percent' }).format(number)
                : value;
        },
    },
    {
        name: 'date',
        label: 'Date',
        category: 'Date & time',
        description: 'Format an ISO-compatible date using a locale.',
        example: '{{invoice.issueDateIso | date("en-GB")}}',
        format: (value, args) => {
            const date = new Date(String(value ?? ''));
            return Number.isNaN(date.getTime())
                ? value
                : new Intl.DateTimeFormat(String(args[0] ?? 'en-GB'), { dateStyle: 'medium' }).format(date);
        },
    },
    {
        name: 'default',
        label: 'Fallback',
        category: 'Logic',
        description: 'Use the argument when the value is empty or missing.',
        example: '{{customer.phone | default("Not provided")}}',
        format: (value, args) => valueMissing(value) ? (args[0] ?? '') : value,
    },
    {
        name: 'json',
        label: 'JSON',
        category: 'Development',
        description: 'Serialize a value as compact JSON.',
        example: '{{project.milestones | json}}',
        format: (value) => JSON.stringify(value),
    },
];
/** Split a formatter pipeline or argument list without splitting inside quotes/parentheses. */
export function splitExpressionParts(value, delimiter = '|') {
    const parts = [];
    let current = '';
    let quote = null;
    let depth = 0;
    for (let index = 0; index < value.length; index += 1) {
        const character = value[index];
        if (quote) {
            current += character;
            if (character === quote && value[index - 1] !== '\\')
                quote = null;
            continue;
        }
        if (character === '"' || character === "'") {
            quote = character;
            current += character;
            continue;
        }
        if (character === '(')
            depth += 1;
        else if (character === ')')
            depth = Math.max(0, depth - 1);
        if (character === delimiter && depth === 0) {
            parts.push(current.trim());
            current = '';
        }
        else {
            current += character;
        }
    }
    parts.push(current.trim());
    return parts;
}
function parseArgument(value, context) {
    const trimmed = value.trim();
    if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
        return trimmed.slice(1, -1).replace(/\\([\\'"nrt])/g, (_match, escaped) => {
            if (escaped === 'n')
                return '\n';
            if (escaped === 'r')
                return '\r';
            if (escaped === 't')
                return '\t';
            return escaped;
        });
    }
    if (trimmed === 'true')
        return true;
    if (trimmed === 'false')
        return false;
    if (trimmed === 'null')
        return null;
    if (/^-?\d+(?:\.\d+)?$/.test(trimmed))
        return Number(trimmed);
    return resolveDataPath(context, trimmed);
}
/** Split legacy Handlebars-style helper arguments without evaluating source. */
function splitHelperArguments(value) {
    const parts = [];
    let current = '';
    let quote = null;
    let depth = 0;
    for (let index = 0; index < value.length; index += 1) {
        const character = value[index];
        if (quote) {
            current += character;
            if (character === quote && value[index - 1] !== '\\')
                quote = null;
            continue;
        }
        if (character === '"' || character === "'") {
            quote = character;
            current += character;
            continue;
        }
        if (character === '(' || character === '[' || character === '{')
            depth += 1;
        else if (character === ')' || character === ']' || character === '}')
            depth = Math.max(0, depth - 1);
        if (/\s/.test(character) && depth === 0) {
            if (current.trim())
                parts.push(current.trim());
            current = '';
        }
        else {
            current += character;
        }
    }
    if (current.trim())
        parts.push(current.trim());
    return parts;
}
export function parseFormatterInvocation(value, context) {
    const match = /^([a-zA-Z_$][\w$]*)(?:\((.*)\))?$/.exec(value.trim());
    if (!match)
        return null;
    return {
        name: match[1],
        args: match[2]?.trim()
            ? splitExpressionParts(match[2], ',').map((argument) => parseArgument(argument, context))
            : [],
    };
}
function formatterMap(runtime) {
    const map = new Map(BUILTIN_TEMPLATE_FORMATTERS.map((formatter) => [formatter.name, formatter]));
    for (const formatter of runtime?.formatters ?? [])
        map.set(formatter.name, formatter);
    return map;
}
/** Evaluate a safe path + formatter pipeline without `eval`. */
export function evaluateTemplateExpression(expression, context, runtime) {
    const custom = runtime?.evaluator?.(expression, context);
    if (custom !== undefined)
        return custom;
    const formatters = formatterMap(runtime);
    const pipeline = splitExpressionParts(expression, '|');
    let value;
    let formatterParts;
    const first = pipeline[0] ?? '';
    const direct = parseFormatterInvocation(first, context);
    const directFormatter = direct && first.includes('(') ? formatters.get(direct.name) : undefined;
    if (direct && directFormatter) {
        value = directFormatter.format(direct.args[0], direct.args.slice(1), context);
        formatterParts = pipeline.slice(1);
    }
    else {
        // Support Handlebars-style helpers with one or more safe arguments:
        // {{uppercase customer.name}} and {{add invoice.subtotal invoice.tax}}.
        const helperParts = splitHelperArguments(first);
        const helperFormatter = helperParts.length > 1 ? formatters.get(helperParts[0]) : undefined;
        if (helperFormatter) {
            const args = helperParts.slice(1).map((argument) => parseArgument(argument, context));
            value = helperFormatter.format(args[0], args.slice(1), context);
            formatterParts = pipeline.slice(1);
        }
        else {
            value = resolveDataPath(context, first);
            formatterParts = pipeline.slice(1);
        }
    }
    for (const part of formatterParts) {
        const invocation = parseFormatterInvocation(part, context);
        if (!invocation)
            continue;
        const formatter = formatters.get(invocation.name);
        if (formatter)
            value = formatter.format(value, invocation.args, context);
    }
    return value;
}
export function interpolateTemplateExpressions(template, context, runtime) {
    const withConditionals = template.replace(/\{\{#if\s+([^}]+?)\s*\}\}([\s\S]*?)\{\{\/if\}\}/g, (_match, expression, body) => {
        const elseMarker = '{{else}}';
        const elseIndex = body.indexOf(elseMarker);
        const truthy = elseIndex >= 0 ? body.slice(0, elseIndex) : body;
        const fallback = elseIndex >= 0 ? body.slice(elseIndex + elseMarker.length) : '';
        return evaluateTemplateExpression(expression, context, runtime) ? truthy : fallback;
    });
    return withConditionals.replace(/\{\{\s*([^#/][^}]*?)\s*\}\}/g, (_match, expression) => {
        const value = evaluateTemplateExpression(expression, context, runtime);
        return value === undefined || value === null ? '' : String(value);
    });
}
