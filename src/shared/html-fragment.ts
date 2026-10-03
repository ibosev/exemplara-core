import type {
  ComponentNode,
  ExemplaraDocument,
  RegionName,
  StyleRule,
} from '../core/types.js';
import { importHtmlCss, type HtmlImportOptions, type HtmlImportResult } from './html-import.js';

export interface HtmlFragmentTarget {
  /** Insert after or replace this node when it belongs to the target document. */
  selectedNodeId?: string | null;
  /** Fallback page when there is no valid selection. */
  activePageId?: string | null;
  /** Defaults to inserting after the selection. */
  placement?: 'after' | 'replace';
}

export interface HtmlFragmentResult {
  document: ExemplaraDocument;
  nodeIds: string[];
  warnings: string[];
  insertedAfterSelection: boolean;
  replacedSelection: boolean;
}

export interface PreparedHtmlFragment {
  nodes: ComponentNode[];
  rules: StyleRule[];
  warnings: string[];
  customCss?: string;
}

function visitNode(node: ComponentNode, callback: (node: ComponentNode) => void): void {
  callback(node);
  for (const child of node.children ?? []) visitNode(child, callback);
  for (const children of Object.values(node.slots ?? {})) {
    for (const child of children) visitNode(child, callback);
  }
}

function selectedNodeLocation(
  document: ExemplaraDocument,
  nodeId: string,
): { pageId: string; region: RegionName } | null {
  for (const page of document.pages) {
    for (const regionName of ['header', 'body', 'footer', 'background'] as const) {
      const region = page.regions[regionName];
      if (!region) continue;
      let found = false;
      for (const node of region.children) {
        visitNode(node, (candidate) => { if (candidate.id === nodeId) found = true; });
      }
      if (found) return { pageId: page.id, region: regionName };
    }
  }
  return null;
}

function insertAfterNode(
  nodes: readonly ComponentNode[],
  targetId: string,
  insertions: readonly ComponentNode[],
): { nodes: ComponentNode[]; inserted: boolean } {
  for (const [index, node] of nodes.entries()) {
    if (node.id === targetId) {
      return {
        nodes: [...nodes.slice(0, index + 1), ...insertions, ...nodes.slice(index + 1)],
        inserted: true,
      };
    }

    if (node.children?.length) {
      const result = insertAfterNode(node.children, targetId, insertions);
      if (result.inserted) {
        const next = [...nodes];
        next[index] = { ...node, children: result.nodes };
        return { nodes: next, inserted: true };
      }
    }

    if (node.slots) {
      for (const [slotName, slotNodes] of Object.entries(node.slots)) {
        const result = insertAfterNode(slotNodes, targetId, insertions);
        if (result.inserted) {
          const next = [...nodes];
          next[index] = {
            ...node,
            slots: { ...node.slots, [slotName]: result.nodes },
          };
          return { nodes: next, inserted: true };
        }
      }
    }
  }
  return { nodes: [...nodes], inserted: false };
}

function replaceNode(
  nodes: readonly ComponentNode[],
  targetId: string,
  replacements: readonly ComponentNode[],
): { nodes: ComponentNode[]; replaced: boolean } {
  for (const [index, node] of nodes.entries()) {
    if (node.id === targetId) {
      return {
        nodes: [...nodes.slice(0, index), ...replacements, ...nodes.slice(index + 1)],
        replaced: true,
      };
    }

    if (node.children?.length) {
      const result = replaceNode(node.children, targetId, replacements);
      if (result.replaced) {
        const next = [...nodes];
        next[index] = { ...node, children: result.nodes };
        return { nodes: next, replaced: true };
      }
    }

    if (node.slots) {
      for (const [slotName, slotNodes] of Object.entries(node.slots)) {
        const result = replaceNode(slotNodes, targetId, replacements);
        if (result.replaced) {
          const next = [...nodes];
          next[index] = {
            ...node,
            slots: { ...node.slots, [slotName]: result.nodes },
          };
          return { nodes: next, replaced: true };
        }
      }
    }
  }
  return { nodes: [...nodes], replaced: false };
}

function remapImportedStyles(
  nodes: ComponentNode[],
  rules: readonly StyleRule[],
  existingIds: ReadonlySet<string>,
): StyleRule[] {
  const idMap = new Map<string, string>();
  const allocatedIds = new Set(existingIds);
  for (const rule of rules) {
    let nextId = `fragment-${crypto.randomUUID()}`;
    while (allocatedIds.has(nextId)) nextId = `fragment-${crypto.randomUUID()}`;
    allocatedIds.add(nextId);
    idMap.set(rule.id, nextId);
  }
  for (const node of nodes) {
    visitNode(node, (candidate) => {
      candidate.styleBindings = candidate.styleBindings?.map((binding) => ({
        ...binding,
        ruleId: binding.ruleId ? (idMap.get(binding.ruleId) ?? binding.ruleId) : undefined,
      }));
    });
  }
  return rules.map((rule) => {
    const nextId = idMap.get(rule.id) ?? rule.id;
    return {
      ...rule,
      id: nextId,
      selectors: rule.selectors.map((selector) =>
        selector.replaceAll(`.ex-r-${rule.id}`, `.ex-r-${nextId}`)),
      properties: { ...rule.properties },
    };
  });
}

/** Detach an imported fragment and remap its style ids for a target document. */
export function prepareHtmlImportFragment(
  document: ExemplaraDocument,
  imported: HtmlImportResult,
): PreparedHtmlFragment {
  const importedNodes = imported.document.pages.flatMap((page) => page.regions.body.children);
  if (!importedNodes.length) throw new Error('The imported fragment contained no editable content.');

  const nodes = structuredClone(importedNodes);
  const rules = remapImportedStyles(
    nodes,
    imported.document.styles.rules,
    new Set(document.styles.rules.map((rule) => rule.id)),
  );
  const customCss = imported.document.meta.web?.customCss?.trim();
  return {
    nodes,
    rules,
    warnings: [...imported.warnings],
    ...(customCss ? { customCss } : {}),
  };
}

function mergeCustomCss(current: string | undefined, addition: string | undefined): string | undefined {
  const existing = current?.trim();
  const next = addition?.trim();
  if (!next || existing?.includes(next)) return existing;
  return existing ? `${existing}\n\n${next}` : next;
}

/** Merge an already sanitized HTML import into an existing document. */
export function applyHtmlImportFragment(
  document: ExemplaraDocument,
  imported: HtmlImportResult,
  target: HtmlFragmentTarget = {},
): HtmlFragmentResult {
  const prepared = prepareHtmlImportFragment(document, imported);
  const { nodes, rules } = prepared;
  const selection = target.selectedNodeId
    ? selectedNodeLocation(document, target.selectedNodeId)
    : null;
  const placement = target.placement ?? 'after';
  if (placement === 'replace' && !selection) {
    throw new Error('The selected element is no longer available to replace.');
  }
  const targetPageId = selection?.pageId ?? target.activePageId ?? document.pages[0]?.id;
  if (!targetPageId) throw new Error('No page is available for the imported fragment.');

  let insertedAfterSelection = false;
  let replacedSelection = false;
  const pages = document.pages.map((page) => {
    if (page.id !== targetPageId) return page;
    const regions = { ...page.regions };
    if (target.selectedNodeId && selection?.pageId === targetPageId) {
      const region = regions[selection.region];
      if (region) {
        if (placement === 'replace') {
          const replaced = replaceNode(region.children, target.selectedNodeId, nodes);
          regions[selection.region] = { ...region, children: replaced.nodes };
          replacedSelection = replaced.replaced;
        } else {
          const inserted = insertAfterNode(region.children, target.selectedNodeId, nodes);
          regions[selection.region] = { ...region, children: inserted.nodes };
          insertedAfterSelection = inserted.inserted;
        }
      }
    }
    if (placement === 'after' && !insertedAfterSelection) {
      regions.body = {
        ...regions.body,
        children: [...regions.body.children, ...nodes],
      };
    }
    return {
      ...page,
      regions,
    };
  });

  return {
    document: {
      ...document,
      pages,
      styles: { ...document.styles, rules: [...document.styles.rules, ...rules] },
      meta: {
        ...document.meta,
        ...(document.meta.web && prepared.customCss
          ? {
              web: {
                ...document.meta.web,
                customCss: mergeCustomCss(document.meta.web.customCss, prepared.customCss),
              },
            }
          : {}),
        updatedAt: new Date().toISOString(),
      },
    },
    nodeIds: nodes.map((node) => node.id),
    warnings: prepared.warnings,
    insertedAfterSelection,
    replacedSelection,
  };
}

/** Sanitize an HTML/CSS fragment and merge its editable AST into a document. */
export function insertHtmlCssFragment(
  document: ExemplaraDocument,
  markup: string,
  options: HtmlImportOptions & HtmlFragmentTarget = {},
): HtmlFragmentResult {
  const { selectedNodeId, activePageId, placement, ...importOptions } = options;
  return applyHtmlImportFragment(
    document,
    importHtmlCss(markup, importOptions),
    { selectedNodeId, activePageId, placement },
  );
}
