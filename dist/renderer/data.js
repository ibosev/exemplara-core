import { evaluateTemplateExpression, interpolateTemplateExpressions, } from '../shared/expression.js';
/** Resolve a dot path ("customer.address.city", supports array indices) against a context. */
export function resolvePath(context, path) {
    if (!path)
        return context;
    const normalized = path.replace(/^(?:\.\.\/)+/, '');
    if (normalized === 'this') {
        return context && typeof context === 'object' && 'item' in context
            ? context.item
            : context;
    }
    let current = context;
    const segments = normalized.startsWith('this.')
        ? ['item', ...normalized.slice('this.'.length).split('.')]
        : normalized.split('.');
    for (const segment of segments) {
        if (current === null || current === undefined)
            return undefined;
        if (Array.isArray(current) && /^\d+$/.test(segment)) {
            current = current[Number(segment)];
        }
        else if (typeof current === 'object') {
            current = current[segment];
        }
        else {
            return undefined;
        }
    }
    return current;
}
/** Replace `{{path.to.value}}` placeholders in a string with context values. */
export function interpolate(template, context, expressionRuntime) {
    return interpolateTemplateExpressions(template, context, expressionRuntime);
}
export function evaluateCondition(context, path, operator, expected) {
    const actual = resolvePath(context, path);
    switch (operator) {
        case 'eq':
            // Loose comparison across primitives ("42" == 42) is intentional:
            // condition values usually arrive as strings from the editor UI.
            return String(actual) === String(expected) || actual === expected;
        case 'neq':
            return !(String(actual) === String(expected) || actual === expected);
        case 'gt':
            return Number(actual) > Number(expected);
        case 'lt':
            return Number(actual) < Number(expected);
        case 'exists':
            return actual !== undefined && actual !== null;
        case 'empty':
            if (actual === undefined || actual === null || actual === '')
                return true;
            if (Array.isArray(actual))
                return actual.length === 0;
            if (typeof actual === 'object')
                return Object.keys(actual).length === 0;
            return false;
        case 'truthy':
            return Array.isArray(actual) ? actual.length > 0 : Boolean(actual);
        default:
            return false;
    }
}
const BUILTIN_BINDING_TRANSFORMS = [
    ['uppercase', (v) => String(v).toUpperCase()],
    ['lowercase', (v) => String(v).toLowerCase()],
    ['capitalize', (v) => String(v).charAt(0).toUpperCase() + String(v).slice(1)],
    ['number', (v) => (Number.isFinite(Number(v)) ? Number(v).toLocaleString() : v)],
    ['json', (v) => JSON.stringify(v)],
];
export function createBindingTransformRegistry(initial = BUILTIN_BINDING_TRANSFORMS) {
    const transforms = new Map(initial);
    return {
        register: (name, transform) => transforms.set(name, transform),
        unregister: (name) => transforms.delete(name),
        get: (name) => transforms.get(name),
        entries: () => [...transforms.entries()],
    };
}
/** Mutable compatibility registry for the original process-wide API. */
export const legacyBindingTransformRegistry = createBindingTransformRegistry();
/** Register a named transform usable via DataBinding.transform. */
export function registerTransform(name, transform) {
    legacyBindingTransformRegistry.register(name, transform);
}
export function unregisterTransform(name) {
    return legacyBindingTransformRegistry.unregister(name);
}
export function getTransform(name) {
    return legacyBindingTransformRegistry.get(name);
}
function interpolatePropValue(value, context, expressionRuntime) {
    if (typeof value === 'string') {
        return value.includes('{{') ? interpolate(value, context, expressionRuntime) : value;
    }
    if (Array.isArray(value)) {
        return value.map((item) => interpolatePropValue(item, context, expressionRuntime));
    }
    if (value && typeof value === 'object') {
        return Object.fromEntries(Object.entries(value).map(([key, item]) => [
            key,
            interpolatePropValue(item, context, expressionRuntime),
        ]));
    }
    return value;
}
/**
 * Return a copy of `node` with data bindings applied to its props and
 * `{{…}}` interpolation performed on string props.
 *
 * A binding resolves against its `sourceId`'s data when that source is
 * present in `sources`; when the source is missing — or the path is not
 * found there — it falls back to the ambient `context` (which includes
 * repeater item scope).
 */
export function resolveNodeData(node, context, sources = {}, expressionRuntime, transformRegistry = legacyBindingTransformRegistry) {
    const props = Object.fromEntries(Object.entries(node.props).map(([key, value]) => [
        key,
        interpolatePropValue(value, context, expressionRuntime),
    ]));
    for (const binding of node.dataBindings ?? []) {
        const scope = sources[binding.sourceId];
        let resolved = scope !== undefined ? resolvePath(scope, binding.path) : undefined;
        if (resolved === undefined)
            resolved = resolvePath(context, binding.path);
        if (resolved !== undefined && resolved !== null && binding.transform) {
            const transform = transformRegistry.get(binding.transform);
            if (transform) {
                resolved = transform(resolved);
            }
            else {
                // Registered expression formatters and the optional host evaluator also
                // work for explicit DataBinding transforms, not only inline strings.
                resolved = evaluateTemplateExpression(`$value | ${binding.transform}`, { ...context, $value: resolved }, expressionRuntime);
            }
        }
        props[binding.targetProp] =
            resolved === undefined || resolved === null ? (binding.fallback ?? '') : resolved;
    }
    return { ...node, props };
}
