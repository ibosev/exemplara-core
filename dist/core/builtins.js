// The 11 built-in Exemplara components, redefined for the Svelte edition.
export const textDefinition = {
    type: 'text',
    label: 'Text',
    icon: '📝',
    category: 'content',
    traits: ['text', 'printable'],
    defaultProps: {
        content: 'Text',
        fontSize: 12,
        fontWeight: 'normal',
        color: '',
        align: 'left',
    },
    propSchema: {
        content: { type: 'richtext', label: 'Content', default: 'Text', multiline: true },
        fontSize: { type: 'number', label: 'Font size (px)', default: 12, min: 4, max: 200 },
        fontWeight: { type: 'enum', label: 'Weight', default: 'normal', enumValues: ['normal', 'bold', '300', '500', '600', '700'] },
        color: { type: 'color', label: 'Color', default: '' },
        align: { type: 'enum', label: 'Alignment', default: 'left', enumValues: ['left', 'center', 'right', 'justify'] },
    },
};
export const imageDefinition = {
    type: 'image',
    label: 'Image',
    icon: '🖼️',
    category: 'media',
    traits: ['media', 'printable'],
    defaultProps: { src: '', alt: '', width: '', height: '', objectFit: 'contain' },
    propSchema: {
        src: { type: 'image', label: 'Source', default: '', required: true },
        alt: { type: 'string', label: 'Alt text', default: '' },
        width: { type: 'string', label: 'Width', default: '' },
        height: { type: 'string', label: 'Height', default: '' },
        objectFit: { type: 'enum', label: 'Object fit', default: 'contain', enumValues: ['contain', 'cover', 'fill', 'none'] },
    },
};
export const containerDefinition = {
    type: 'container',
    label: 'Container',
    icon: '📦',
    category: 'layout',
    traits: ['container', 'layout'],
    acceptsChildren: true,
    defaultProps: {
        direction: 'column',
        gap: 0,
        padding: 0,
        background: '',
        align: 'stretch',
        justify: 'flex-start',
    },
    propSchema: {
        direction: { type: 'enum', label: 'Direction', default: 'column', enumValues: ['row', 'column'] },
        gap: { type: 'number', label: 'Gap (px)', default: 0, min: 0, max: 200 },
        padding: { type: 'number', label: 'Padding (px)', default: 0, min: 0, max: 200 },
        background: { type: 'color', label: 'Background', default: '' },
        align: { type: 'enum', label: 'Align items', default: 'stretch', enumValues: ['stretch', 'flex-start', 'center', 'flex-end'] },
        justify: { type: 'enum', label: 'Justify', default: 'flex-start', enumValues: ['flex-start', 'center', 'flex-end', 'space-between', 'space-around'] },
    },
};
export const columnsDefinition = {
    type: 'columns',
    label: 'Columns',
    icon: '🏛️',
    category: 'layout',
    traits: ['container', 'layout'],
    defaultProps: { ratios: [1, 1], gap: 16 },
    propSchema: {
        ratios: { type: 'array', label: 'Column ratios', default: [1, 1], itemSchema: { type: 'number', label: 'Ratio', min: 1 } },
        gap: { type: 'number', label: 'Gap (px)', default: 16, min: 0, max: 200 },
    },
    slots: {
        col1: { label: 'Column 1' },
        col2: { label: 'Column 2' },
    },
};
export const spacerDefinition = {
    type: 'spacer',
    label: 'Spacer',
    icon: '↕️',
    category: 'layout',
    traits: ['layout'],
    defaultProps: { height: 16 },
    propSchema: {
        height: { type: 'number', label: 'Height (px)', default: 16, min: 1, max: 500 },
    },
};
export const dividerDefinition = {
    type: 'divider',
    label: 'Divider',
    icon: '➖',
    category: 'content',
    traits: ['printable'],
    defaultProps: { thickness: 1, color: '#cccccc', style: 'solid' },
    propSchema: {
        thickness: { type: 'number', label: 'Thickness (px)', default: 1, min: 1, max: 20 },
        color: { type: 'color', label: 'Color', default: '#cccccc' },
        style: { type: 'enum', label: 'Style', default: 'solid', enumValues: ['solid', 'dashed', 'dotted', 'double'] },
    },
};
export const tableDefinition = {
    type: 'table',
    label: 'Table',
    icon: '📊',
    category: 'content',
    traits: ['data-bound', 'printable'],
    defaultProps: {
        columns: [
            { key: 'name', label: 'Name' },
            { key: 'value', label: 'Value' },
        ],
        rows: [],
        striped: false,
        showHeader: true,
    },
    propSchema: {
        columns: {
            type: 'array',
            label: 'Columns',
            default: [],
            itemSchema: {
                type: 'object',
                label: 'Column',
                properties: {
                    key: { type: 'string', label: 'Data key', required: true },
                    label: { type: 'string', label: 'Header label' },
                    format: { type: 'string', label: 'Display format' },
                },
            },
        },
        rows: { type: 'array', label: 'Rows', default: [], itemSchema: { type: 'object', label: 'Row' } },
        striped: { type: 'boolean', label: 'Striped rows', default: false },
        showHeader: { type: 'boolean', label: 'Show header', default: true },
    },
};
export const pageBreakDefinition = {
    type: 'page-break',
    label: 'Page break',
    icon: '✂️',
    category: 'layout',
    traits: ['layout', 'printable'],
    defaultProps: {},
    propSchema: {},
};
export const watermarkDefinition = {
    type: 'watermark',
    label: 'Watermark',
    icon: '💧',
    category: 'overlay',
    traits: ['overlay', 'printable'],
    defaultProps: { text: 'CONFIDENTIAL', opacity: 0.12, fontSize: 72, color: '#000000', rotation: -35 },
    propSchema: {
        text: { type: 'string', label: 'Text', default: 'CONFIDENTIAL' },
        opacity: { type: 'number', label: 'Opacity', default: 0.12, min: 0, max: 1 },
        fontSize: { type: 'number', label: 'Font size (px)', default: 72, min: 8, max: 400 },
        color: { type: 'color', label: 'Color', default: '#000000' },
        rotation: { type: 'number', label: 'Rotation (deg)', default: -35, min: -180, max: 180 },
    },
};
export const repeaterDefinition = {
    type: 'repeater',
    label: 'Repeater',
    icon: '🔁',
    category: 'layout',
    traits: ['container', 'data-bound', 'layout'],
    acceptsChildren: true,
    defaultProps: { sourceId: 'local', path: '', maxItems: 0 },
    propSchema: {
        sourceId: { type: 'string', label: 'Data source', default: 'local' },
        path: { type: 'string', label: 'Array path', default: '', description: 'Dot path to the array, e.g. items' },
        maxItems: { type: 'number', label: 'Max items (0 = all)', default: 0, min: 0 },
    },
};
export const conditionalDefinition = {
    type: 'conditional',
    label: 'Conditional',
    icon: '❓',
    category: 'layout',
    traits: ['container', 'data-bound', 'layout'],
    acceptsChildren: true,
    defaultProps: { conditions: [], conditionLogic: 'and', showWhen: true },
    propSchema: {
        conditions: {
            type: 'array',
            label: 'Conditions',
            default: [],
            itemSchema: {
                type: 'object',
                label: 'Condition',
                properties: {
                    field: { type: 'string', label: 'Field path', required: true },
                    operator: { type: 'enum', label: 'Operator', enumValues: ['eq', 'neq', 'gt', 'lt', 'exists', 'empty', 'truthy'] },
                    value: { type: 'string', label: 'Value' },
                },
            },
        },
        conditionLogic: { type: 'enum', label: 'Logic', default: 'and', enumValues: ['and', 'or'] },
        showWhen: { type: 'boolean', label: 'Show when true', default: true },
    },
};
export const builtinDefinitions = [
    textDefinition,
    imageDefinition,
    containerDefinition,
    columnsDefinition,
    spacerDefinition,
    dividerDefinition,
    tableDefinition,
    pageBreakDefinition,
    watermarkDefinition,
    repeaterDefinition,
    conditionalDefinition,
];
