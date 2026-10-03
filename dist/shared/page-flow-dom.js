import { measureContainerFragmentDom, measureTableFragmentDom, measureTextFragmentDom, } from './fragment-dom.js';
/**
 * Measure page bodies using standard DOM APIs only. The pagination planner
 * stays DOM-free and any canvas can share this adapter.
 */
export function measurePageFlowDom(document, pageElements) {
    return document.pages.flatMap((page) => {
        const pageElement = pageElements.get(page.id);
        const body = pageElement?.querySelector(`.exs-region--body[data-region-id="${page.regions.body.id}"]`);
        if (!body)
            return [];
        const bodyRect = body.getBoundingClientRect();
        const sourceNodes = new Map(page.regions.body.children.map((node) => [node.id, node]));
        const nodes = Array.from(body.querySelectorAll(':scope > .exs-node'))
            .map((node) => {
            const rect = node.getBoundingClientRect();
            const style = getComputedStyle(node);
            const marginTop = Number.parseFloat(style.marginTop) || 0;
            const marginBottom = Number.parseFloat(style.marginBottom) || 0;
            const nodeId = node.dataset.nodeId ?? '';
            const sourceNode = sourceNodes.get(nodeId);
            let split;
            if (sourceNode && rect.bottom + marginBottom > bodyRect.bottom) {
                const text = Array.from(node.children).find((child) => child instanceof HTMLElement
                    && child.classList.contains('ex-text')
                    && child.dataset.nodeId === nodeId);
                const table = Array.from(node.children).find((child) => child instanceof HTMLTableElement
                    && child.classList.contains('ex-table')
                    && child.dataset.nodeId === nodeId);
                split = text
                    ? measureTextFragmentDom(text, sourceNode, bodyRect.bottom)
                    : table
                        ? measureTableFragmentDom(table, sourceNode, bodyRect.bottom)
                        : sourceNode.type === 'container'
                            ? measureContainerFragmentDom(node, sourceNode, bodyRect.bottom)
                            : undefined;
            }
            return {
                nodeId,
                top: rect.top - marginTop,
                bottom: rect.bottom + marginBottom,
                height: rect.height + marginTop + marginBottom,
                split,
            };
        })
            .filter((node) => node.nodeId);
        return [{
                pageId: page.id,
                bodyTop: bodyRect.top,
                bodyBottom: bodyRect.bottom,
                nodes,
            }];
    });
}
export function pageFlowResizeTargets(pageElements) {
    return [...pageElements].flatMap((pageElement) => Array.from(pageElement.querySelectorAll('.exs-region--body > .exs-node')));
}
