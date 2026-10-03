import type { Command } from './commands.js';
import type { PageFlowSplitMeasurement } from './pagination.js';
import type { ComponentNode, ExemplaraDocument } from './types.js';
export interface CollapseFlowGroupPlan {
    rootId: string | null;
    commands: Command[];
}
export declare function flowFragmentCount(doc: ExemplaraDocument): number;
/** Collapse a logical text/table/container fragment group before content editing. */
export declare function planCollapseFlowGroup(doc: ExemplaraDocument, groupId: string): CollapseFlowGroupPlan;
export declare function planAdjacentFragmentMerge(doc: ExemplaraDocument): Command[];
export declare function splitFlowNode(node: ComponentNode, split: PageFlowSplitMeasurement): {
    headChanges: Partial<ComponentNode>;
    tail: ComponentNode;
} | null;
