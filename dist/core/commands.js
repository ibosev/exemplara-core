import { cloneNodeDeep } from './create.js';
import { syncWebCustomCssFromToken } from './custom-css-tokens.js';
import { findNode, isSelfOrDescendant, locateNode, resolveContainer, visitNodes } from './tree.js';
export class CommandError extends Error {
    command;
    constructor(message, command) {
        super(message);
        this.command = command;
        this.name = 'CommandError';
    }
}
function clampIndex(index, length) {
    if (index === undefined)
        return length;
    return Math.max(0, Math.min(index, length));
}
function detachSymbolReferences(nodes, symbolId) {
    for (const node of nodes) {
        if (node.symbolId === symbolId)
            delete node.symbolId;
        if (node.children)
            detachSymbolReferences(node.children, symbolId);
        for (const slotChildren of Object.values(node.slots ?? {})) {
            detachSymbolReferences(slotChildren, symbolId);
        }
    }
}
/**
 * Apply a command by mutating `doc`. Throws CommandError on invalid input
 * (unknown ids, cyclic moves) without any partial mutation.
 */
export function applyCommand(doc, cmd) {
    switch (cmd.type) {
        case 'document:update': {
            Object.assign(doc, cmd.payload.changes);
            break;
        }
        case 'component:add': {
            const { parentId, slot, index, node } = cmd.payload;
            const container = resolveContainer(doc, parentId, slot);
            if (!container)
                throw new CommandError(`Parent not found: ${parentId}`, cmd);
            container.splice(clampIndex(index, container.length), 0, node);
            break;
        }
        case 'component:remove': {
            const location = locateNode(doc, cmd.payload.nodeId);
            if (!location)
                throw new CommandError(`Node not found: ${cmd.payload.nodeId}`, cmd);
            location.siblings.splice(location.index, 1);
            break;
        }
        case 'component:move': {
            const { nodeId, targetParentId, targetSlot, targetIndex } = cmd.payload;
            const location = locateNode(doc, nodeId);
            if (!location)
                throw new CommandError(`Node not found: ${nodeId}`, cmd);
            const node = location.siblings[location.index];
            if (isSelfOrDescendant(node, targetParentId)) {
                throw new CommandError(`Cannot move node ${nodeId} into itself`, cmd);
            }
            const container = resolveContainer(doc, targetParentId, targetSlot);
            if (!container)
                throw new CommandError(`Target parent not found: ${targetParentId}`, cmd);
            location.siblings.splice(location.index, 1);
            let index = clampIndex(targetIndex, container.length);
            // When moving forwards inside the same array the removal shifts
            // indices down by one.
            if (container === location.siblings && targetIndex > location.index) {
                index = clampIndex(targetIndex - 1, container.length);
            }
            container.splice(index, 0, node);
            break;
        }
        case 'component:update': {
            const { nodeId, changes } = cmd.payload;
            const node = findNode(doc, nodeId);
            if (!node)
                throw new CommandError(`Node not found: ${nodeId}`, cmd);
            const { id: _id, props, ...rest } = changes;
            if (props)
                Object.assign(node.props, props);
            Object.assign(node, rest);
            break;
        }
        case 'component:duplicate': {
            const location = locateNode(doc, cmd.payload.nodeId);
            if (!location)
                throw new CommandError(`Node not found: ${cmd.payload.nodeId}`, cmd);
            const copy = cloneNodeDeep(location.siblings[location.index]);
            location.siblings.splice(location.index + 1, 0, copy);
            break;
        }
        case 'page:add': {
            const { page, index } = cmd.payload;
            doc.pages.splice(clampIndex(index, doc.pages.length), 0, page);
            break;
        }
        case 'page:remove': {
            const index = doc.pages.findIndex((p) => p.id === cmd.payload.pageId);
            if (index === -1)
                throw new CommandError(`Page not found: ${cmd.payload.pageId}`, cmd);
            doc.pages.splice(index, 1);
            break;
        }
        case 'page:reorder': {
            const { pageId, newIndex } = cmd.payload;
            const index = doc.pages.findIndex((p) => p.id === pageId);
            if (index === -1)
                throw new CommandError(`Page not found: ${pageId}`, cmd);
            const [page] = doc.pages.splice(index, 1);
            doc.pages.splice(clampIndex(newIndex, doc.pages.length), 0, page);
            break;
        }
        case 'page:update': {
            const { pageId, changes } = cmd.payload;
            const page = doc.pages.find((p) => p.id === pageId);
            if (!page)
                throw new CommandError(`Page not found: ${pageId}`, cmd);
            const { id: _id, ...rest } = changes;
            Object.assign(page, rest);
            break;
        }
        case 'print:update': {
            Object.assign(doc.print, cmd.payload.changes);
            break;
        }
        case 'pagination:update': {
            Object.assign(doc.pagination, cmd.payload.changes);
            break;
        }
        case 'style:add-rule': {
            doc.styles.rules.push(cmd.payload.rule);
            break;
        }
        case 'style:update-rule': {
            const rule = doc.styles.rules.find((r) => r.id === cmd.payload.ruleId);
            if (!rule)
                throw new CommandError(`Style rule not found: ${cmd.payload.ruleId}`, cmd);
            const { id: _id, ...rest } = cmd.payload.changes;
            Object.assign(rule, rest);
            break;
        }
        case 'style:remove-rule': {
            const index = doc.styles.rules.findIndex((r) => r.id === cmd.payload.ruleId);
            if (index === -1)
                throw new CommandError(`Style rule not found: ${cmd.payload.ruleId}`, cmd);
            doc.styles.rules.splice(index, 1);
            break;
        }
        case 'style:update-tokens': {
            const { path, value } = cmd.payload;
            const segments = path.split('.');
            if (segments.length < 2)
                throw new CommandError(`Invalid token path: ${path}`, cmd);
            let target = doc.styles.tokens;
            for (const segment of segments.slice(0, -1)) {
                const next = target[segment];
                if (typeof next !== 'object' || next === null) {
                    throw new CommandError(`Invalid token path: ${path}`, cmd);
                }
                target = next;
            }
            target[segments[segments.length - 1]] = value;
            if (doc.meta.medium === 'web' && doc.meta.web?.customCss) {
                const nextCss = syncWebCustomCssFromToken(doc.meta.web.customCss, path, value);
                if (nextCss !== doc.meta.web.customCss)
                    doc.meta.web.customCss = nextCss;
            }
            break;
        }
        case 'data:add-source': {
            doc.dataSources.push(cmd.payload.source);
            break;
        }
        case 'data:update-source': {
            const source = doc.dataSources.find((s) => s.id === cmd.payload.sourceId);
            if (!source)
                throw new CommandError(`Data source not found: ${cmd.payload.sourceId}`, cmd);
            const { id: _id, ...rest } = cmd.payload.changes;
            Object.assign(source, rest);
            break;
        }
        case 'data:remove-source': {
            const index = doc.dataSources.findIndex((s) => s.id === cmd.payload.sourceId);
            if (index === -1)
                throw new CommandError(`Data source not found: ${cmd.payload.sourceId}`, cmd);
            doc.dataSources.splice(index, 1);
            break;
        }
        case 'asset:add': {
            doc.assets.push(cmd.payload.asset);
            break;
        }
        case 'asset:remove': {
            const index = doc.assets.findIndex((a) => a.id === cmd.payload.assetId);
            if (index === -1)
                throw new CommandError(`Asset not found: ${cmd.payload.assetId}`, cmd);
            doc.assets.splice(index, 1);
            break;
        }
        case 'symbol:create': {
            doc.symbols.push(cmd.payload.symbol);
            break;
        }
        case 'symbol:rename': {
            const symbol = doc.symbols.find((entry) => entry.id === cmd.payload.symbolId);
            if (!symbol)
                throw new CommandError(`Symbol not found: ${cmd.payload.symbolId}`, cmd);
            const label = cmd.payload.label.trim();
            if (!label)
                throw new CommandError('Symbol label cannot be empty', cmd);
            symbol.label = label;
            break;
        }
        case 'symbol:remove': {
            const index = doc.symbols.findIndex((entry) => entry.id === cmd.payload.symbolId);
            if (index === -1)
                throw new CommandError(`Symbol not found: ${cmd.payload.symbolId}`, cmd);
            visitNodes(doc, (node) => {
                if (node.symbolId === cmd.payload.symbolId)
                    delete node.symbolId;
            });
            for (const symbol of doc.symbols) {
                detachSymbolReferences([symbol.definition], cmd.payload.symbolId);
            }
            doc.symbols.splice(index, 1);
            break;
        }
        case 'symbol:detach': {
            const node = findNode(doc, cmd.payload.nodeId);
            if (!node)
                throw new CommandError(`Node not found: ${cmd.payload.nodeId}`, cmd);
            delete node.symbolId;
            break;
        }
        default: {
            const exhaustive = cmd;
            throw new Error(`Unknown command: ${exhaustive.type}`);
        }
    }
    doc.meta.updatedAt = new Date().toISOString();
}
