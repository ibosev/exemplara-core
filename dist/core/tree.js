export function* iterateRegions(page) {
    const { header, body, footer, background } = page.regions;
    if (header)
        yield ['header', header];
    yield ['body', body];
    if (footer)
        yield ['footer', footer];
    if (background)
        yield ['background', background];
}
/** Document-level website chrome shared by every route. */
export function* iterateWebChrome(doc) {
    const header = doc.meta.web?.header;
    const footer = doc.meta.web?.footer;
    if (header)
        yield ['header', header];
    if (footer)
        yield ['footer', footer];
}
/** Depth-first visit of every node in the document. Return false to stop. */
export function visitNodes(doc, visit) {
    const walk = (nodes, parentId) => {
        for (const node of nodes) {
            if (visit(node, parentId) === false)
                return false;
            if (node.children && !walk(node.children, node.id))
                return false;
            if (node.slots) {
                for (const slotChildren of Object.values(node.slots)) {
                    if (!walk(slotChildren, node.id))
                        return false;
                }
            }
        }
        return true;
    };
    for (const [, region] of iterateWebChrome(doc)) {
        if (!walk(region.children, region.id))
            return;
    }
    for (const page of doc.pages) {
        for (const [, region] of iterateRegions(page)) {
            if (!walk(region.children, region.id))
                return;
        }
    }
}
export function findNode(doc, nodeId) {
    let found = null;
    visitNodes(doc, (node) => {
        if (node.id === nodeId) {
            found = node;
            return false;
        }
    });
    return found;
}
/** Locate a node together with the array that contains it. */
export function locateNode(doc, nodeId) {
    for (const [regionName, region] of iterateWebChrome(doc)) {
        const location = locateInArray(region.children, nodeId, region.id, undefined, doc.id, regionName);
        if (location)
            return location;
    }
    for (const page of doc.pages) {
        for (const [regionName, region] of iterateRegions(page)) {
            const location = locateInArray(region.children, nodeId, region.id, undefined, page.id, regionName);
            if (location)
                return location;
        }
    }
    return null;
}
/** Return a component parent, or null when the node is directly inside a page region. */
export function findParentNode(doc, nodeId) {
    const location = locateNode(doc, nodeId);
    return location ? findNode(doc, location.parentId) : null;
}
/** True when a node is an immediate child of a page's printable body region. */
export function isDirectBodyNode(doc, nodeId) {
    const location = locateNode(doc, nodeId);
    return !!location && doc.pages.some((page) => page.regions.body.id === location.parentId);
}
function locateInArray(siblings, nodeId, parentId, slot, pageId, region) {
    for (let index = 0; index < siblings.length; index++) {
        const node = siblings[index];
        if (node.id === nodeId) {
            return { siblings, index, parentId, slot, pageId, region };
        }
        if (node.children) {
            const found = locateInArray(node.children, nodeId, node.id, undefined, pageId, region);
            if (found)
                return found;
        }
        if (node.slots) {
            for (const [slotName, slotChildren] of Object.entries(node.slots)) {
                const found = locateInArray(slotChildren, nodeId, node.id, slotName, pageId, region);
                if (found)
                    return found;
            }
        }
    }
    return null;
}
/**
 * Resolve the child array for a parent id (region id or node id).
 * For component parents a slot name may address a named slot; otherwise
 * the default `children` array is used (created on demand).
 */
export function resolveContainer(doc, parentId, slot) {
    for (const [, region] of iterateWebChrome(doc)) {
        if (region.id === parentId)
            return region.children;
    }
    for (const page of doc.pages) {
        for (const [, region] of iterateRegions(page)) {
            if (region.id === parentId)
                return region.children;
        }
    }
    const parent = findNode(doc, parentId);
    if (!parent)
        return null;
    if (slot) {
        parent.slots ??= {};
        parent.slots[slot] ??= [];
        return parent.slots[slot];
    }
    parent.children ??= [];
    return parent.children;
}
/** True when `ancestorId` is the node itself or one of its descendants. */
export function isSelfOrDescendant(node, ancestorId) {
    if (node.id === ancestorId)
        return true;
    for (const child of node.children ?? []) {
        if (isSelfOrDescendant(child, ancestorId))
            return true;
    }
    for (const slotChildren of Object.values(node.slots ?? {})) {
        for (const child of slotChildren) {
            if (isSelfOrDescendant(child, ancestorId))
                return true;
        }
    }
    return false;
}
export function collectNodeIds(doc) {
    const ids = new Set();
    visitNodes(doc, (node) => {
        ids.add(node.id);
    });
    return ids;
}
