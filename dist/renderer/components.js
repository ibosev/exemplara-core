import { escapeAttr, escapeHtml, styleString } from './escape.js';
import { evaluateCondition, resolvePath } from './data.js';
import { containsMarkup, sanitizeHtml } from '../shared/richtext.js';
import { paragraphStyleMap } from '../shared/ruler.js';
import { evaluateTemplateExpression } from '../shared/expression.js';
import { columnPresentation, columnsPresentation, containerPresentation, nodePresentation, numberValue as num, stringValue as str, } from './presentation.js';
// Built-in HTML renderers for the 11 core component types.
// Prop values arrive already data-resolved (bindings + interpolation).
export function registerBuiltinRenderers(registry) {
    const registerRenderer = registry.register;
    /**
     * Standard attribute set for a rendered node: base class + rule-binding
     * classes, data-node-id, and inline styles merged with value-based
     * styleBindings (bindings win).
     */
    function nodeAttrs(node, baseClass, style = {}) {
        return presentationAttrs(node, nodePresentation(node, baseClass, style));
    }
    function presentationAttrs(node, presentation) {
        const styleStr = styleString(presentation.style);
        const htmlId = str(node.props.htmlId).trim();
        return `class="${escapeAttr(presentation.classes.join(' '))}" data-node-id="${escapeAttr(node.id)}"${htmlId ? ` id="${escapeAttr(htmlId)}"` : ''}${styleStr ? ` style="${escapeAttr(styleStr)}"` : ''}`;
    }
    registerRenderer('text', (node) => {
        const { content, fontSize, fontWeight, color, align } = node.props;
        const raw = str(content);
        const attrs = nodeAttrs(node, 'ex-text', {
            ...paragraphStyleMap(node.paragraph),
            'font-size': fontSize ? `${num(fontSize, 12)}px` : undefined,
            'font-weight': str(fontWeight) || undefined,
            color: str(color) || undefined,
            'text-align': str(align) || undefined,
            'white-space': !containsMarkup(raw) && raw.includes('\t') ? 'pre-wrap' : undefined,
        });
        // Sanitize before detecting markup so legacy content polluted with invisible
        // editor comment anchors is cleaned before the plain-text escape path.
        const sanitized = sanitizeHtml(raw);
        const html = containsMarkup(sanitized) ? sanitized : escapeHtml(sanitized);
        return `<div ${attrs}>${html}</div>`;
    });
    registerRenderer('image', (node) => {
        const { src, alt, width, height, objectFit } = node.props;
        const attrs = nodeAttrs(node, 'ex-image', {
            width: str(width) || undefined,
            height: str(height) || undefined,
            'object-fit': str(objectFit) || undefined,
        });
        return `<img ${attrs} src="${escapeAttr(str(src))}" alt="${escapeAttr(str(alt))}" />`;
    });
    registerRenderer('container', (node, children) => {
        const attrs = presentationAttrs(node, containerPresentation(node));
        return `<div ${attrs}>${children}</div>`;
    });
    registerRenderer('columns', (node, _children, ctx) => {
        const ratios = Array.isArray(node.props.ratios) ? node.props.ratios : [1, 1];
        const cols = ratios
            .map((_ratio, i) => {
            const slotName = `col${i + 1}`;
            const slotChildren = node.slots?.[slotName] ?? [];
            const inner = ctx.renderChildren(slotChildren, ctx);
            const presentation = columnPresentation(ratios, node.props.gap, i);
            return `<div class="${presentation.classes.join(' ')}" style="${escapeAttr(styleString(presentation.style))}">${inner}</div>`;
        })
            .join('');
        const attrs = presentationAttrs(node, columnsPresentation(node));
        return `<div ${attrs}>${cols}</div>`;
    }, { managesChildren: true });
    registerRenderer('spacer', (node) => {
        const attrs = nodeAttrs(node, 'ex-spacer', { height: `${num(node.props.height, 16)}px` });
        return `<div ${attrs}></div>`;
    });
    registerRenderer('divider', (node) => {
        const { thickness, color, style: lineStyle } = node.props;
        const attrs = nodeAttrs(node, 'ex-divider', {
            border: 'none',
            'border-top': `${num(thickness, 1)}px ${str(lineStyle, 'solid')} ${str(color, '#cccccc')}`,
        });
        return `<hr ${attrs} />`;
    });
    registerRenderer('table', (node, _children, ctx) => {
        const columns = Array.isArray(node.props.columns) ? node.props.columns : [];
        let rows = Array.isArray(node.props.rows) ? node.props.rows : [];
        const sourceRowOffset = node.flow?.kind === 'table' ? node.flow.tableRange?.start ?? 0 : 0;
        if (node.flow?.kind === 'table' && node.flow.tableRange) {
            rows = rows.slice(node.flow.tableRange.start, node.flow.tableRange.end);
        }
        const showHeader = node.props.showHeader !== false;
        const striped = node.props.striped === true;
        const head = showHeader
            ? `<thead><tr>${columns.map((c) => `<th>${escapeHtml(str(c.label ?? c.key))}</th>`).join('')}</tr></thead>`
            : '';
        const body = rows
            .map((row, i) => {
            const cells = columns
                .map((c) => {
                const value = resolvePath(row, c.key);
                const formatted = ctx.resolveData && c.format
                    ? evaluateTemplateExpression(`$value | ${c.format}`, { ...ctx.dataContext, $value: value }, ctx.expressionRuntime)
                    : value;
                return `<td>${escapeHtml(str(formatted))}</td>`;
            })
                .join('');
            const stripe = striped && (sourceRowOffset + i) % 2 === 1 ? ' class="ex-table-row--striped"' : '';
            return `<tr${stripe}>${cells}</tr>`;
        })
            .join('');
        const attrs = nodeAttrs(node, 'ex-table', { width: '100%', 'border-collapse': 'collapse' });
        return `<table ${attrs}>${head}<tbody>${body}</tbody></table>`;
    });
    registerRenderer('page-break', (node) => {
        const attrs = nodeAttrs(node, 'ex-page-break', {
            'page-break-after': 'always',
            'break-after': 'page',
        });
        return `<div ${attrs}></div>`;
    });
    registerRenderer('watermark', (node) => {
        const { text, opacity, fontSize, color, rotation } = node.props;
        const attrs = nodeAttrs(node, 'ex-watermark', {
            position: 'absolute',
            inset: '0',
            display: 'flex',
            'align-items': 'center',
            'justify-content': 'center',
            'pointer-events': 'none',
            'z-index': '10',
        });
        const textStyle = styleString({
            'font-size': `${num(fontSize, 72)}px`,
            color: str(color, '#000000'),
            opacity: String(num(opacity, 0.12)),
            transform: `rotate(${num(rotation, -35)}deg)`,
            'font-weight': '700',
            'white-space': 'nowrap',
        });
        return `<div ${attrs}><span style="${escapeAttr(textStyle)}">${escapeHtml(str(text, 'CONFIDENTIAL'))}</span></div>`;
    });
    registerRenderer('repeater', (node, _children, ctx) => {
        const path = str(node.props.path);
        const maxItems = num(node.props.maxItems, 0);
        const resolved = path ? resolvePath(ctx.dataContext, path) : undefined;
        let items = Array.isArray(resolved) ? resolved : [];
        if (maxItems > 0)
            items = items.slice(0, maxItems);
        const inner = items
            .map((item, index) => {
            const scopedContext = {
                ...ctx.dataContext,
                ...(item && typeof item === 'object' && !Array.isArray(item) ? item : {}),
                item,
                index,
                count: items.length,
                first: index === 0,
                last: index === items.length - 1,
                '@index': index,
                '@first': index === 0,
                '@last': index === items.length - 1,
            };
            return ctx.renderChildren(node.children ?? [], { ...ctx, dataContext: scopedContext });
        })
            .join('');
        const attrs = nodeAttrs(node, 'ex-repeater');
        return `<div ${attrs}>${inner}</div>`;
    }, { managesChildren: true });
    registerRenderer('conditional', (node, _children, ctx) => {
        const conditions = Array.isArray(node.props.conditions)
            ? node.props.conditions
            : [];
        const logic = str(node.props.conditionLogic, 'and');
        const showWhen = node.props.showWhen !== false;
        let result = true;
        if (conditions.length > 0) {
            const evaluate = (c) => evaluateCondition(ctx.dataContext, c.field, (c.operator ?? 'exists'), c.value);
            result = logic === 'or' ? conditions.some(evaluate) : conditions.every(evaluate);
        }
        const visible = result === showWhen;
        const inner = ctx.renderChildren(visible ? node.children ?? [] : node.slots?.else ?? [], ctx);
        if (!inner)
            return '';
        const attrs = nodeAttrs(node, 'ex-conditional');
        return `<div ${attrs}>${inner}</div>`;
    }, { managesChildren: true });
}
export const builtinRendererCount = 11;
