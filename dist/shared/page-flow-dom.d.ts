import type { PageFlowMeasurement } from '../core/pagination.js';
import type { ExemplaraDocument } from '../core/types.js';
/**
 * Measure page bodies using standard DOM APIs only. The pagination planner
 * stays DOM-free and any canvas can share this adapter.
 */
export declare function measurePageFlowDom(document: ExemplaraDocument, pageElements: ReadonlyMap<string, HTMLElement>): PageFlowMeasurement[];
export declare function pageFlowResizeTargets(pageElements: Iterable<HTMLElement>): HTMLElement[];
