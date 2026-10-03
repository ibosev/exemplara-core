import type { Command } from './commands.js';
import { cloneNodeDeep } from './create.js';
import type {
  PageFlowContainerSplitMeasurement,
  PageFlowLeafSplitMeasurement,
  PageFlowSplitMeasurement,
} from './pagination.js';
import { findParentNode, visitNodes } from './tree.js';
import type { ComponentFlowFragment, ComponentNode, ExemplaraDocument } from './types.js';

export interface CollapseFlowGroupPlan {
  rootId: string | null;
  commands: Command[];
}

function fragmentsInGroup(doc: ExemplaraDocument, groupId: string): ComponentNode[] {
  const fragments: ComponentNode[] = [];
  visitNodes(doc, (node) => {
    if (node.flow?.groupId === groupId) fragments.push(node);
  });
  return fragments;
}

export function flowFragmentCount(doc: ExemplaraDocument): number {
  let count = 0;
  visitNodes(doc, (node) => {
    if (node.flow && !findParentNode(doc, node.id)?.flow) count += 1;
  });
  return count;
}

function mergedTextContent(fragments: readonly ComponentNode[]): string {
  const original = fragments[0]?.flow?.originalContent;
  if (original !== undefined) return original;
  return fragments.map((fragment) => String(fragment.props.content ?? '')).join('');
}

function enclosingContainerFlowGroup(
  doc: ExemplaraDocument,
  node: ComponentNode,
): string | null {
  let current: ComponentNode | null = node;
  let groupId: string | null = null;
  while (current) {
    const parent = findParentNode(doc, current.id);
    if (parent?.flow?.kind === 'container') groupId = parent.flow.groupId;
    current = parent;
  }
  return groupId;
}

function mergeFlowPair(head: ComponentNode, tail: ComponentNode): ComponentNode {
  if (!head.flow || !tail.flow || head.flow.groupId !== tail.flow.groupId) {
    return head;
  }
  if (head.flow.kind === 'text' && tail.flow.kind === 'text') {
    return {
      ...head,
      props: {
        ...head.props,
        content: `${String(head.props.content ?? '')}${String(tail.props.content ?? '')}`,
      },
      flow: { ...head.flow },
    };
  }
  if (head.flow.kind === 'table' && tail.flow.kind === 'table') {
    return {
      ...head,
      flow: {
        ...head.flow,
        tableRange: {
          start: head.flow.tableRange?.start ?? 0,
          end: tail.flow.tableRange?.end ?? head.flow.tableRange?.end ?? 0,
        },
      },
    };
  }
  if (head.flow.kind === 'container' && tail.flow.kind === 'container') {
    const headChildren = [...(head.children ?? [])];
    const tailChildren = [...(tail.children ?? [])];
    const lastHead = headChildren.at(-1);
    const firstTail = tailChildren[0];
    if (lastHead?.flow && firstTail?.flow && lastHead.flow.groupId === firstTail.flow.groupId) {
      headChildren[headChildren.length - 1] = mergeFlowPair(lastHead, firstTail);
      tailChildren.shift();
    }
    return {
      ...head,
      children: [...headChildren, ...tailChildren],
      flow: { ...head.flow },
    };
  }
  return head;
}

function clearFlowDeep(node: ComponentNode): ComponentNode {
  const next = structuredClone(node);
  const clear = (candidate: ComponentNode): void => {
    if (candidate.flow?.kind === 'text' && candidate.flow.originalContent !== undefined) {
      candidate.props = { ...candidate.props, content: candidate.flow.originalContent };
    }
    candidate.flow = undefined;
    candidate.children?.forEach(clear);
    for (const children of Object.values(candidate.slots ?? {})) children.forEach(clear);
  };
  clear(next);
  return next;
}

/** Collapse a logical text/table/container fragment group before content editing. */
export function planCollapseFlowGroup(
  doc: ExemplaraDocument,
  groupId: string,
): CollapseFlowGroupPlan {
  const fragments = fragmentsInGroup(doc, groupId);
  const root = fragments[0];
  if (!root) return { rootId: null, commands: [] };
  const enclosingGroup = enclosingContainerFlowGroup(doc, root);
  if (enclosingGroup && enclosingGroup !== groupId) {
    return planCollapseFlowGroup(doc, enclosingGroup);
  }
  if (root.flow?.kind === 'container') {
    const merged = clearFlowDeep(fragments.slice(1).reduce(mergeFlowPair, structuredClone(root)));
    return {
      rootId: root.id,
      commands: [
        {
          type: 'component:update',
          payload: {
            nodeId: root.id,
            changes: { children: merged.children, flow: undefined },
          },
        },
        ...fragments.slice(1).map((fragment): Command => ({
          type: 'component:remove',
          payload: { nodeId: fragment.id },
        })),
      ],
    };
  }
  const changes: Partial<ComponentNode> = { flow: undefined };
  if (root.flow?.kind === 'text') {
    changes.props = { content: mergedTextContent(fragments) };
  }
  return {
    rootId: root.id,
    commands: [
      { type: 'component:update', payload: { nodeId: root.id, changes } },
      ...fragments.slice(1).map((fragment): Command => ({
        type: 'component:remove',
        payload: { nodeId: fragment.id },
      })),
    ],
  };
}

function mergedFlow(
  head: ComponentNode,
  tail: ComponentNode,
  remainingFragments: number,
): ComponentFlowFragment | undefined {
  if (!head.flow || !tail.flow || remainingFragments <= 1) return undefined;
  if (head.flow.kind === 'table') {
    return {
      ...head.flow,
      tableRange: {
        start: head.flow.tableRange?.start ?? 0,
        end: tail.flow.tableRange?.end ?? head.flow.tableRange?.end ?? 0,
      },
    };
  }
  return { ...head.flow };
}

export function planAdjacentFragmentMerge(doc: ExemplaraDocument): Command[] {
  for (const page of doc.pages) {
    const nodes = page.regions.body.children;
    for (let index = 0; index < nodes.length - 1; index++) {
      const head = nodes[index]!;
      const tail = nodes[index + 1]!;
      if (!head.flow || !tail.flow || head.flow.groupId !== tail.flow.groupId) continue;
      const fragments = fragmentsInGroup(doc, head.flow.groupId);
      if (head.flow.kind === 'container' && tail.flow.kind === 'container') {
        const merged = mergeFlowPair(head, tail);
        const finalMerge = fragments.length - 1 <= 1;
        const restored = finalMerge ? clearFlowDeep(merged) : merged;
        return [
          {
            type: 'component:update',
            payload: {
              nodeId: head.id,
              changes: { children: restored.children, flow: restored.flow },
            },
          },
          { type: 'component:remove', payload: { nodeId: tail.id } },
        ];
      }
      const changes: Partial<ComponentNode> = {
        flow: mergedFlow(head, tail, fragments.length - 1),
      };
      if (head.flow.kind === 'text') {
        const finalMerge = fragments.length - 1 <= 1;
        changes.props = {
          content: finalMerge && head.flow.originalContent !== undefined
            ? head.flow.originalContent
            : `${String(head.props.content ?? '')}${String(tail.props.content ?? '')}`,
        };
      }
      return [
        { type: 'component:update', payload: { nodeId: head.id, changes } },
        { type: 'component:remove', payload: { nodeId: tail.id } },
      ];
    }
  }
  return [];
}

function applyChanges(
  node: ComponentNode,
  changes: Partial<ComponentNode>,
): ComponentNode {
  const { props, ...rest } = changes;
  return {
    ...node,
    ...(props ? { props: { ...node.props, ...props } } : {}),
    ...rest,
  };
}

function containerFlow(node: ComponentNode, continuation: boolean): ComponentFlowFragment {
  return {
    groupId: node.flow?.kind === 'container' ? node.flow.groupId : node.id,
    kind: 'container',
    continuation,
  };
}

interface ContainerPartition {
  head: ComponentNode | null;
  tail: ComponentNode | null;
}

function partitionContainerAtTarget(
  node: ComponentNode,
  split: PageFlowContainerSplitMeasurement,
): ContainerPartition | null {
  const children = node.children ?? [];
  for (const [index, child] of children.entries()) {
    let partition: ContainerPartition | null = null;
    if (child.id === split.targetNodeId) {
      if (split.targetSplit) {
        const leaf = splitLeafFlowNode(child, split.targetSplit);
        if (!leaf) return null;
        partition = {
          head: applyChanges(child, leaf.headChanges),
          tail: leaf.tail,
        };
      } else {
        partition = { head: null, tail: cloneNodeDeep(child) };
      }
    } else if (child.type === 'container') {
      partition = partitionContainerAtTarget(child, split);
    }
    if (!partition) continue;

    const headChildren = [
      ...children.slice(0, index),
      ...(partition.head ? [partition.head] : []),
    ];
    const tailChildren = [
      ...(partition.tail ? [partition.tail] : []),
      ...children.slice(index + 1).map(cloneNodeDeep),
    ];
    const head = headChildren.length > 0 ? { ...node, children: headChildren } : null;
    const tail = tailChildren.length > 0
      ? { ...cloneNodeDeep(node), children: tailChildren }
      : null;
    if (head && tail) {
      head.flow = containerFlow(node, node.flow?.continuation ?? false);
      tail.flow = containerFlow(node, true);
    }
    return { head, tail };
  }
  return null;
}

function splitContainerFlowNode(
  node: ComponentNode,
  split: PageFlowContainerSplitMeasurement,
): { headChanges: Partial<ComponentNode>; tail: ComponentNode } | null {
  if (node.type !== 'container' || node.pagination?.keepTogether) return null;
  const partition = partitionContainerAtTarget(node, split);
  if (!partition?.head || !partition.tail) return null;
  return {
    headChanges: {
      children: partition.head.children,
      flow: partition.head.flow,
    },
    tail: partition.tail,
  };
}

function splitLeafFlowNode(
  node: ComponentNode,
  split: PageFlowLeafSplitMeasurement,
): { headChanges: Partial<ComponentNode>; tail: ComponentNode } | null {
  if (node.pagination?.keepTogether) return null;
  const groupId = node.flow?.groupId ?? node.id;
  const tail = cloneNodeDeep(node);

  if (split.kind === 'text') {
    if (!split.headContent || !split.tailContent) return null;
    const originalContent = node.flow?.originalContent ?? String(node.props.content ?? '');
    const headFlow: ComponentFlowFragment = {
      groupId,
      kind: 'text',
      continuation: node.flow?.continuation ?? false,
      originalContent,
    };
    tail.props = { ...tail.props, content: split.tailContent };
    tail.flow = { groupId, kind: 'text', continuation: true, originalContent };
    return {
      headChanges: {
        props: { content: split.headContent },
        flow: headFlow,
      },
      tail,
    };
  }

  if (split.splitIndex <= 0 || split.splitIndex >= split.rowCount) return null;
  const currentStart = node.flow?.kind === 'table' ? node.flow.tableRange?.start ?? 0 : 0;
  const currentEnd = node.flow?.kind === 'table'
    ? node.flow.tableRange?.end ?? currentStart + split.rowCount
    : currentStart + split.rowCount;
  const splitAt = currentStart + split.splitIndex;
  const headFlow: ComponentFlowFragment = {
    groupId,
    kind: 'table',
    continuation: node.flow?.continuation ?? false,
    tableRange: { start: currentStart, end: splitAt },
  };
  tail.flow = {
    groupId,
    kind: 'table',
    continuation: true,
    tableRange: { start: splitAt, end: currentEnd },
  };
  return { headChanges: { flow: headFlow }, tail };
}

export function splitFlowNode(
  node: ComponentNode,
  split: PageFlowSplitMeasurement,
): { headChanges: Partial<ComponentNode>; tail: ComponentNode } | null {
  return split.kind === 'container'
    ? splitContainerFlowNode(node, split)
    : splitLeafFlowNode(node, split);
}
