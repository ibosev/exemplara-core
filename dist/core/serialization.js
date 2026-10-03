import { DOCUMENT_VERSION } from './types.js';
import { migrateDocument } from './migrate.js';
export function validateDocument(doc) {
    const issues = [];
    const push = (path, message) => issues.push({ path, message });
    const isRecord = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);
    if (typeof doc !== 'object' || doc === null) {
        return { valid: false, issues: [{ path: '', message: 'Document must be an object' }] };
    }
    const d = doc;
    if (d.version !== DOCUMENT_VERSION)
        push('version', `Expected version ${DOCUMENT_VERSION}`);
    if (typeof d.id !== 'string' || !d.id)
        push('id', 'Missing document id');
    if (typeof d.name !== 'string')
        push('name', 'Missing document name');
    if (!Array.isArray(d.pages))
        push('pages', 'pages must be an array');
    if (!Array.isArray(d.dataSources))
        push('dataSources', 'dataSources must be an array');
    if (!Array.isArray(d.assets))
        push('assets', 'assets must be an array');
    if (!Array.isArray(d.symbols))
        push('symbols', 'symbols must be an array');
    if (!isRecord(d.print)) {
        push('print', 'Missing print settings');
    }
    else if (!Array.isArray(d.print.sections) || d.print.sections.length === 0) {
        push('print.sections', 'At least one print section is required');
    }
    else {
        const sectionIds = new Set();
        d.print.sections.forEach((section, index) => {
            if (!section.id)
                push(`print.sections[${index}].id`, 'Missing section id');
            else if (sectionIds.has(section.id))
                push(`print.sections[${index}].id`, `Duplicate section id: ${section.id}`);
            else
                sectionIds.add(section.id);
            if (!isRecord(section.header))
                push(`print.sections[${index}].header`, 'Missing header settings');
            if (!isRecord(section.footer))
                push(`print.sections[${index}].footer`, 'Missing footer settings');
        });
    }
    for (const position of ['header', 'footer']) {
        const template = isRecord(d.print) ? d.print[position] : undefined;
        if (!isRecord(template)) {
            push(`print.${position}`, `Missing ${position} template`);
            continue;
        }
        if (typeof template.enabled !== 'boolean')
            push(`print.${position}.enabled`, 'Expected a boolean');
        if (typeof template.height !== 'number' || !Number.isFinite(template.height)) {
            push(`print.${position}.height`, 'Expected a finite number');
        }
        if (!isRecord(template.variants)) {
            push(`print.${position}.variants`, 'Missing template variants');
        }
        else {
            for (const variant of ['default', 'first', 'odd', 'even']) {
                if (typeof template.variants[variant] !== 'string') {
                    push(`print.${position}.variants.${variant}`, 'Expected a string');
                }
            }
        }
    }
    if (isRecord(d.print) && typeof d.print.css !== 'string')
        push('print.css', 'Expected a string');
    if (!isRecord(d.pagination))
        push('pagination', 'Missing pagination settings');
    if (!isRecord(d.styles)) {
        push('styles', 'Missing styles');
    }
    else if (!Array.isArray(d.styles.rules)) {
        push('styles.rules', 'Style rules must be an array');
    }
    else {
        const ruleIds = new Set();
        d.styles.rules.forEach((rule, index) => {
            const path = `styles.rules[${index}]`;
            if (!isRecord(rule)) {
                push(path, 'Style rule must be an object');
                return;
            }
            if (typeof rule.id !== 'string' || !rule.id)
                push(`${path}.id`, 'Missing rule id');
            else if (ruleIds.has(rule.id))
                push(`${path}.id`, `Duplicate rule id: ${rule.id}`);
            else
                ruleIds.add(rule.id);
            if (!Array.isArray(rule.selectors) || rule.selectors.some((value) => typeof value !== 'string')) {
                push(`${path}.selectors`, 'Selectors must be an array of strings');
            }
            if (!isRecord(rule.properties) || Object.values(rule.properties).some((value) => typeof value !== 'string')) {
                push(`${path}.properties`, 'Properties must contain string values');
            }
        });
    }
    if (!isRecord(d.meta)) {
        push('meta', 'Missing meta');
    }
    else {
        if (d.meta.medium !== 'print' && d.meta.medium !== 'web') {
            push('meta.medium', 'Expected print or web');
        }
        if (d.meta.medium === 'web') {
            if (!isRecord(d.meta.web)) {
                push('meta.web', 'Web documents require web settings');
            }
            else {
                if (typeof d.meta.web.viewportWidth !== 'number' || !Number.isFinite(d.meta.web.viewportWidth)) {
                    push('meta.web.viewportWidth', 'Expected a finite number');
                }
                if (typeof d.meta.web.minHeight !== 'number' || !Number.isFinite(d.meta.web.minHeight)) {
                    push('meta.web.minHeight', 'Expected a finite number');
                }
                if (d.meta.web.customCss !== undefined && typeof d.meta.web.customCss !== 'string') {
                    push('meta.web.customCss', 'Expected a string');
                }
                if (d.meta.web.importMode !== undefined
                    && d.meta.web.importMode !== 'native'
                    && d.meta.web.importMode !== 'lossless-html') {
                    push('meta.web.importMode', 'Expected native or lossless-html');
                }
            }
        }
    }
    if (Array.isArray(d.pages)) {
        const nodeIds = new Set();
        const pageIds = new Set();
        const regionIds = new Set();
        const walkNodes = (nodes, path) => {
            if (!Array.isArray(nodes)) {
                push(path, 'Children must be an array');
                return;
            }
            nodes.forEach((node, i) => {
                const nodePath = `${path}[${i}]`;
                if (!isRecord(node)) {
                    push(nodePath, 'Node must be an object');
                    return;
                }
                if (typeof node.id !== 'string' || !node.id)
                    push(`${nodePath}.id`, 'Missing node id');
                else if (nodeIds.has(node.id))
                    push(`${nodePath}.id`, `Duplicate node id: ${node.id}`);
                else
                    nodeIds.add(node.id);
                if (typeof node.type !== 'string' || !node.type)
                    push(`${nodePath}.type`, 'Missing node type');
                if (!isRecord(node.props))
                    push(`${nodePath}.props`, 'Missing node props');
                if (node.children !== undefined)
                    walkNodes(node.children, `${nodePath}.children`);
                if (node.slots !== undefined && !isRecord(node.slots)) {
                    push(`${nodePath}.slots`, 'Slots must be an object');
                }
                else if (isRecord(node.slots)) {
                    for (const [slotName, slotChildren] of Object.entries(node.slots)) {
                        walkNodes(slotChildren, `${nodePath}.slots.${slotName}`);
                    }
                }
                for (const field of ['styleBindings', 'dataBindings', 'conditions']) {
                    if (node[field] !== undefined && !Array.isArray(node[field])) {
                        push(`${nodePath}.${field}`, `${field} must be an array`);
                    }
                }
            });
        };
        d.pages.forEach((page, i) => {
            const pagePath = `pages[${i}]`;
            if (!page || typeof page !== 'object') {
                push(pagePath, 'Page must be an object');
                return;
            }
            if (typeof page.id !== 'string' || !page.id)
                push(`${pagePath}.id`, 'Missing page id');
            else if (pageIds.has(page.id))
                push(`${pagePath}.id`, `Duplicate page id: ${page.id}`);
            else
                pageIds.add(page.id);
            if (!page.size || typeof page.size.width !== 'number' || typeof page.size.height !== 'number') {
                push(`${pagePath}.size`, 'Page size requires numeric width/height');
            }
            if (!page.regions?.body) {
                push(`${pagePath}.regions.body`, 'Page requires a body region');
                return;
            }
            for (const name of ['header', 'body', 'footer', 'background']) {
                const region = page.regions[name];
                if (!region)
                    continue;
                if (typeof region.id !== 'string' || !region.id)
                    push(`${pagePath}.regions.${name}.id`, 'Missing region id');
                else if (regionIds.has(region.id))
                    push(`${pagePath}.regions.${name}.id`, `Duplicate region id: ${region.id}`);
                else
                    regionIds.add(region.id);
                if (!Array.isArray(region.children)) {
                    push(`${pagePath}.regions.${name}.children`, 'Region children must be an array');
                    continue;
                }
                walkNodes(region.children, `${pagePath}.regions.${name}.children`);
            }
        });
    }
    return { valid: issues.length === 0, issues };
}
export function serialize(doc, pretty = false) {
    return JSON.stringify(doc, null, pretty ? 2 : undefined);
}
export class DeserializationError extends Error {
    issues;
    constructor(message, issues = []) {
        super(message);
        this.issues = issues;
        this.name = 'DeserializationError';
    }
}
export function deserialize(json, options = {}) {
    let parsed;
    try {
        parsed = JSON.parse(json);
    }
    catch (error) {
        throw new DeserializationError(`Invalid JSON: ${error.message}`);
    }
    if (options.migrate !== false &&
        typeof parsed === 'object' &&
        parsed !== null &&
        parsed.version !== DOCUMENT_VERSION) {
        try {
            parsed = migrateDocument(parsed);
        }
        catch (error) {
            throw new DeserializationError(error.message);
        }
    }
    const result = validateDocument(parsed);
    if (!result.valid) {
        throw new DeserializationError(`Invalid document: ${result.issues.map((i) => `${i.path}: ${i.message}`).join('; ')}`, result.issues);
    }
    return parsed;
}
