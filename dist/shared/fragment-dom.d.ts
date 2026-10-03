import type { PageFlowContainerSplitMeasurement, PageFlowTableSplitMeasurement, PageFlowTextSplitMeasurement } from '../core/pagination.js';
import type { ComponentNode } from '../core/types.js';
/**
 * Propose a safe rich-text split using live line boxes. The returned HTML is
 * sanitized and balanced by Range.cloneContents(); the portable core remains
 * responsible for applying the fragment to the document AST.
 */
export declare function measureTextFragmentDom(root: HTMLElement, node: ComponentNode, availableBottom: number): PageFlowTextSplitMeasurement | undefined;
/** Propose a table split on a complete row boundary. */
export declare function measureTableFragmentDom(table: HTMLTableElement, node: ComponentNode, availableBottom: number): PageFlowTableSplitMeasurement | undefined;
/**
 * Find a safe split inside nested vertical containers. Horizontal/grid layout
 * remains atomic because duplicating those shells would change column geometry.
 */
export declare function measureContainerFragmentDom(outer: HTMLElement, node: ComponentNode, availableBottom: number): PageFlowContainerSplitMeasurement | undefined;
