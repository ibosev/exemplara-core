import type { Command } from './commands.js';
import type { ExemplaraDocument } from './types.js';
export { flowFragmentCount, planCollapseFlowGroup } from './flow-fragments.js';
export type { CollapseFlowGroupPlan } from './flow-fragments.js';
export interface PageFlowTextSplitMeasurement {
    kind: 'text';
    headContent: string;
    tailContent: string;
    linesBefore: number;
    linesAfter: number;
}
export interface PageFlowTableSplitMeasurement {
    kind: 'table';
    /** Number of rendered rows that fit in this fragment. */
    splitIndex: number;
    /** Total rendered rows in the current fragment. */
    rowCount: number;
}
export type PageFlowLeafSplitMeasurement = PageFlowTextSplitMeasurement | PageFlowTableSplitMeasurement;
export interface PageFlowContainerSplitMeasurement {
    kind: 'container';
    /** Nested child at which the container tree should be partitioned. */
    targetNodeId: string;
    /** Optional safe text/table split when the target itself crosses the page. */
    targetSplit?: PageFlowLeafSplitMeasurement;
}
export type PageFlowSplitMeasurement = PageFlowLeafSplitMeasurement | PageFlowContainerSplitMeasurement;
export interface PageFlowNodeMeasurement {
    nodeId: string;
    top: number;
    bottom: number;
    height: number;
    /** Safe internal split proposed by the framework-neutral DOM adapter. */
    split?: PageFlowSplitMeasurement;
}
export interface PageFlowMeasurement {
    pageId: string;
    bodyTop: number;
    bodyBottom: number;
    nodes: PageFlowNodeMeasurement[];
}
export interface PageFlowPlan {
    commands: Command[];
    /** Pages containing a first block too tall to move or fragment safely. */
    blockedPageIds: string[];
}
/**
 * Plan one stable pagination mutation from live canvas measurements.
 *
 * The DOM adapter proposes safe rich-text/table splits. The core owns all AST
 * fragmentation, generated pages, keep rules, backward flow, and recombination.
 * One operation per pass keeps reflow deterministic across UI frameworks.
 */
export declare function planPageFlow(doc: ExemplaraDocument, measurements: PageFlowMeasurement[]): PageFlowPlan;
