import { createId } from './id.js';
import { DEFAULT_MARGINS, PAGE_PRESETS } from './presets.js';
import { DOCUMENT_VERSION, } from './types.js';
export function createRegion(init = {}) {
    return {
        id: createId('region'),
        children: init.children ?? [],
        ...(init.style ? { style: init.style } : {}),
    };
}
export function createPage(init = {}) {
    const size = init.size ?? { ...PAGE_PRESETS.A4, preset: 'A4' };
    return {
        id: createId('page'),
        label: init.label ?? 'Page',
        size,
        orientation: init.orientation ?? 'portrait',
        margins: init.margins ?? { ...DEFAULT_MARGINS },
        regions: {
            body: createRegion(),
            ...(init.withHeader ? { header: createRegion() } : {}),
            ...(init.withFooter ? { footer: createRegion() } : {}),
            ...(init.withBackground ? { background: createRegion() } : {}),
        },
        headerVariant: 'all',
        footerVariant: 'all',
    };
}
export function createDefaultTokens() {
    return {
        colors: {
            primary: '#2563eb',
            text: '#1f2937',
            muted: '#6b7280',
            background: '#ffffff',
            border: '#e5e7eb',
        },
        typography: {
            body: {
                fontFamily: 'Helvetica, Arial, sans-serif',
                fontSize: '12px',
                fontWeight: '400',
                lineHeight: '1.5',
            },
            heading: {
                fontFamily: 'Helvetica, Arial, sans-serif',
                fontSize: '24px',
                fontWeight: '700',
                lineHeight: '1.2',
            },
        },
        spacing: {
            xs: '4px',
            sm: '8px',
            md: '16px',
            lg: '24px',
            xl: '40px',
        },
        fonts: [],
    };
}
export function createStyleSheet() {
    return { tokens: createDefaultTokens(), rules: [] };
}
export function createPrintSettings() {
    return {
        enabled: true,
        header: {
            enabled: true,
            height: 12,
            variants: {
                default: '<div class="print-header"><strong>{{document.title}}</strong><span>{{page.label}}</span></div>',
                first: '',
                odd: '',
                even: '',
            },
        },
        footer: {
            enabled: true,
            height: 12,
            variants: {
                default: '<div class="print-footer"><span>{{date}}</span><span>Page {{page.number}} of {{page.total}}</span></div>',
                first: '',
                odd: '',
                even: '',
            },
        },
        sections: [createPrintSection({ label: 'Section 1' })],
        css: [
            '.ex-print-template { color: #6b7280; font: 9px/1.35 Inter, Arial, sans-serif; }',
            '.print-header, .print-footer { width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 12px; }',
            '.print-header { border-bottom: 1px solid #d1d5db; padding-bottom: 3mm; }',
            '.print-footer { border-top: 1px solid #d1d5db; padding-top: 3mm; }',
            '.print-header strong { color: #111827; font-size: 10px; }',
        ].join('\n'),
    };
}
export function createPrintSection(init = {}) {
    return {
        id: createId('section'),
        label: init.label ?? 'Section',
        differentFirstPage: init.differentFirstPage ?? true,
        differentOddEven: init.differentOddEven ?? true,
        header: init.header ?? { linkedToPrevious: false },
        footer: init.footer ?? { linkedToPrevious: false },
    };
}
export function createPaginationSettings() {
    return { mode: 'auto', removeEmptyPages: true };
}
export function createDocument(init = {}) {
    const now = new Date().toISOString();
    return {
        version: DOCUMENT_VERSION,
        id: createId('doc'),
        name: init.name ?? 'Untitled Document',
        pages: init.withInitialPage === false ? [] : [createPage({ label: 'Page 1' })],
        styles: createStyleSheet(),
        dataSources: [],
        assets: [],
        symbols: [],
        print: createPrintSettings(),
        pagination: createPaginationSettings(),
        meta: {
            createdAt: now,
            updatedAt: now,
            medium: init.medium ?? 'print',
            ...(init.author ? { author: init.author } : {}),
        },
    };
}
/**
 * Create a ComponentNode of a given type. Props are merged over the
 * registered definition's defaults by the caller (see registry.createNode).
 */
export function createNode(type, props = {}, children) {
    return {
        id: createId('node'),
        type,
        props,
        ...(children ? { children } : {}),
    };
}
/**
 * Deep-clone a node with fresh ids (used by clipboard, symbols, repeater).
 * Uses a JSON round-trip rather than structuredClone so it also accepts
 * reactive state proxies (such as Svelte $state) — the AST is
 * JSON-serializable by design.
 */
/** Deep-clone a page and every nested node with fresh ids. */
export function clonePageDeep(page) {
    const clone = JSON.parse(JSON.stringify(page));
    clone.id = createId('page');
    for (const region of Object.values(clone.regions)) {
        if (!region)
            continue;
        region.id = createId('region');
        region.children = region.children.map((child) => cloneNodeDeep(child));
    }
    return clone;
}
export function cloneNodeDeep(node) {
    const clone = JSON.parse(JSON.stringify(node));
    const reassign = (n) => {
        n.id = createId('node');
        n.children?.forEach(reassign);
        if (n.slots) {
            for (const slotChildren of Object.values(n.slots)) {
                slotChildren.forEach(reassign);
            }
        }
    };
    reassign(clone);
    return clone;
}
