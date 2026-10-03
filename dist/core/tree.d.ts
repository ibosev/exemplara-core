import type { ComponentNode, ExemplaraDocument, Page, Region, RegionName } from './types.js';
export interface NodeLocation {
    /** The array that physically contains the node. */
    siblings: ComponentNode[];
    index: number;
    /** Region or component id that owns the containing array. */
    parentId: string;
    /** Slot name when the containing array is a named slot. */
    slot?: string;
    pageId: string;
    region: RegionName;
}
export declare function iterateRegions(page: Page): Generator<[RegionName, Region]>;
/** Document-level website chrome shared by every route. */
export declare function iterateWebChrome(doc: ExemplaraDocument): Generator<[RegionName, Region]>;
/** Depth-first visit of every node in the document. Return false to stop. */
export declare function visitNodes(doc: ExemplaraDocument, visit: (node: ComponentNode, parentId: string) => boolean | void): void;
export declare function findNode(doc: ExemplaraDocument, nodeId: string): ComponentNode | null;
/** Locate a node together with the array that contains it. */
export declare function locateNode(doc: ExemplaraDocument, nodeId: string): NodeLocation | null;
/** Return a component parent, or null when the node is directly inside a page region. */
export declare function findParentNode(doc: ExemplaraDocument, nodeId: string): ComponentNode | null;
/** True when a node is an immediate child of a page's printable body region. */
export declare function isDirectBodyNode(doc: ExemplaraDocument, nodeId: string): boolean;
/**
 * Resolve the child array for a parent id (region id or node id).
 * For component parents a slot name may address a named slot; otherwise
 * the default `children` array is used (created on demand).
 */
export declare function resolveContainer(doc: ExemplaraDocument, parentId: string, slot?: string): ComponentNode[] | null;
/** True when `ancestorId` is the node itself or one of its descendants. */
export declare function isSelfOrDescendant(node: ComponentNode, ancestorId: string): boolean;
export declare function collectNodeIds(doc: ExemplaraDocument): Set<string>;
