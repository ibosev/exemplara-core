import type {
  PageFlowContainerSplitMeasurement,
  PageFlowTableSplitMeasurement,
  PageFlowTextSplitMeasurement,
} from '../core/pagination.js';
import type { ComponentNode } from '../core/types.js';
import { containsMarkup, sanitizeHtml } from './richtext.js';

const LINE_TOLERANCE_PX = 1;

interface TextPoint {
  node: Text;
  offset: number;
}

function textNodes(root: HTMLElement): Text[] {
  const showText = root.ownerDocument.defaultView?.NodeFilter.SHOW_TEXT ?? 4;
  const walker = root.ownerDocument.createTreeWalker(root, showText);
  const nodes: Text[] = [];
  let current = walker.nextNode();
  while (current) {
    nodes.push(current as Text);
    current = walker.nextNode();
  }
  return nodes;
}

function pointAt(nodes: readonly Text[], absoluteOffset: number): TextPoint | null {
  let remaining = Math.max(0, absoluteOffset);
  for (const node of nodes) {
    const length = node.data.length;
    if (remaining <= length) return { node, offset: remaining };
    remaining -= length;
  }
  const last = nodes.at(-1);
  return last ? { node: last, offset: last.data.length } : null;
}

function rangeFor(
  root: HTMLElement,
  nodes: readonly Text[],
  start: number,
  end: number,
): Range | null {
  const from = pointAt(nodes, start);
  const to = pointAt(nodes, end);
  if (!from || !to) return null;
  const range = root.ownerDocument.createRange();
  range.setStart(from.node, from.offset);
  range.setEnd(to.node, to.offset);
  return range;
}

function rangeBottom(range: Range): number {
  const rects = Array.from(range.getClientRects());
  return rects.length > 0 ? Math.max(...rects.map((rect) => rect.bottom)) : range.getBoundingClientRect().bottom;
}

function lineCount(range: Range): number {
  const tops: number[] = [];
  for (const rect of Array.from(range.getClientRects())) {
    if (rect.width <= 0 || rect.height <= 0) continue;
    if (!tops.some((top) => Math.abs(top - rect.top) <= LINE_TOLERANCE_PX)) tops.push(rect.top);
  }
  return tops.length;
}

const TEXT_BLOCK_TAGS = new Set([
  'ADDRESS', 'BLOCKQUOTE', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
  'LI', 'P', 'PRE', 'TD', 'TH',
]);

function localLineCounts(root: HTMLElement, point: TextPoint): { before: number; after: number } {
  let block = point.node.parentElement;
  while (block && block !== root && !TEXT_BLOCK_TAGS.has(block.tagName)) block = block.parentElement;
  block ??= root;
  const before = root.ownerDocument.createRange();
  before.selectNodeContents(block);
  before.setEnd(point.node, point.offset);
  const after = root.ownerDocument.createRange();
  after.selectNodeContents(block);
  after.setStart(point.node, point.offset);

  // A split exactly between block elements has no local widow/orphan risk.
  const beforeText = before.toString().trim();
  const afterText = after.toString().trim();
  return {
    before: beforeText && afterText ? lineCount(before) : Number.POSITIVE_INFINITY,
    after: beforeText && afterText ? lineCount(after) : Number.POSITIVE_INFINITY,
  };
}

function serializeFragment(root: HTMLElement, range: Range): string {
  const container = root.ownerDocument.createElement('div');
  container.append(range.cloneContents());
  return sanitizeHtml(container.innerHTML);
}

function wordBoundaryAtOrBefore(text: string, offset: number): number {
  let candidate = Math.min(offset, text.length - 1);
  while (candidate > 0 && !/\s/.test(text[candidate - 1] ?? '')) candidate -= 1;
  return candidate > 0 ? candidate : offset;
}

/**
 * Propose a safe rich-text split using live line boxes. The returned HTML is
 * sanitized and balanced by Range.cloneContents(); the portable core remains
 * responsible for applying the fragment to the document AST.
 */
export function measureTextFragmentDom(
  root: HTMLElement,
  node: ComponentNode,
  availableBottom: number,
): PageFlowTextSplitMeasurement | undefined {
  if (node.type !== 'text' || node.pagination?.keepTogether || node.dataBindings?.length) return undefined;
  const source = String(node.props.content ?? '');
  // Interpolated templates cannot be mapped losslessly back to source offsets.
  if (source.includes('{{')) return undefined;

  const nodes = textNodes(root);
  const text = nodes.map((entry) => entry.data).join('');
  if (text.trim().length === 0) return undefined;

  let low = 1;
  let high = text.length - 1;
  let lastFitting = 0;
  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    const range = rangeFor(root, nodes, 0, middle);
    if (range && rangeBottom(range) <= availableBottom) {
      lastFitting = middle;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }
  if (lastFitting <= 0 || lastFitting >= text.length) return undefined;

  const minimumBefore = Math.max(1, node.pagination?.orphanLines ?? 2);
  const minimumAfter = Math.max(1, node.pagination?.widowLines ?? 2);
  let splitOffset = wordBoundaryAtOrBefore(text, lastFitting);
  while (splitOffset > 0) {
    const headRange = rangeFor(root, nodes, 0, splitOffset);
    const tailRange = rangeFor(root, nodes, splitOffset, text.length);
    if (!headRange || !tailRange) return undefined;
    const splitPoint = pointAt(nodes, splitOffset);
    if (!splitPoint) return undefined;
    const localLines = localLineCounts(root, splitPoint);
    const linesBefore = Number.isFinite(localLines.before) ? localLines.before : lineCount(headRange);
    const linesAfter = Number.isFinite(localLines.after) ? localLines.after : lineCount(tailRange);
    if (
      localLines.before >= minimumBefore
      && localLines.after >= minimumAfter
      && rangeBottom(headRange) <= availableBottom
    ) {
      const markup = containsMarkup(source);
      const headContent = markup ? serializeFragment(root, headRange) : text.slice(0, splitOffset);
      const tailContent = markup ? serializeFragment(root, tailRange) : text.slice(splitOffset);
      if (!headContent.trim() || !tailContent.trim()) return undefined;
      return { kind: 'text', headContent, tailContent, linesBefore, linesAfter };
    }
    const previous = text.lastIndexOf(' ', Math.max(0, splitOffset - 2));
    if (previous <= 0) break;
    splitOffset = previous + 1;
  }
  return undefined;
}

/** Propose a table split on a complete row boundary. */
export function measureTableFragmentDom(
  table: HTMLTableElement,
  node: ComponentNode,
  availableBottom: number,
): PageFlowTableSplitMeasurement | undefined {
  if (node.type !== 'table' || node.pagination?.keepTogether) return undefined;
  const rows = Array.from(table.querySelectorAll<HTMLTableRowElement>(':scope > tbody > tr'));
  if (rows.length < 2) return undefined;
  const firstOverflow = rows.findIndex(
    (row) => row.getBoundingClientRect().bottom > availableBottom,
  );
  if (firstOverflow <= 0 || firstOverflow >= rows.length) return undefined;
  return { kind: 'table', splitIndex: firstOverflow, rowCount: rows.length };
}

function renderedContentElement(
  outer: HTMLElement,
  nodeId: string,
  className: string,
): HTMLElement | undefined {
  return Array.from(outer.children).find(
    (child): child is HTMLElement => child instanceof HTMLElement
      && child.dataset.nodeId === nodeId
      && child.classList.contains(className),
  );
}

function verticalContainerContent(
  outer: HTMLElement,
  node: ComponentNode,
): HTMLElement | undefined {
  if (node.type !== 'container' || node.pagination?.keepTogether) return undefined;
  const content = renderedContentElement(outer, node.id, 'ex-container');
  if (!content) return undefined;
  const style = getComputedStyle(content);
  if (style.display.includes('grid')) return undefined;
  if (style.display.includes('flex') && style.flexDirection.startsWith('row')) return undefined;
  return content;
}

function outerChildElement(
  content: HTMLElement,
  childId: string,
): HTMLElement | undefined {
  return Array.from(content.children).find(
    (child): child is HTMLElement => child instanceof HTMLElement
      && child.classList.contains('exs-node')
      && child.dataset.nodeId === childId,
  );
}

/**
 * Find a safe split inside nested vertical containers. Horizontal/grid layout
 * remains atomic because duplicating those shells would change column geometry.
 */
export function measureContainerFragmentDom(
  outer: HTMLElement,
  node: ComponentNode,
  availableBottom: number,
): PageFlowContainerSplitMeasurement | undefined {
  const content = verticalContainerContent(outer, node);
  if (!content) return undefined;
  const containerStyle = getComputedStyle(content);
  const trailingInset = (Number.parseFloat(containerStyle.paddingBottom) || 0)
    + (Number.parseFloat(containerStyle.borderBottomWidth) || 0);
  // A child fitting exactly at the page boundary is not enough: the cloned
  // continuation shell still needs its own bottom padding and border. Reserve
  // that decoration at every recursive container level.
  const childAvailableBottom = availableBottom - trailingInset;

  for (const child of node.children ?? []) {
    const childOuter = outerChildElement(content, child.id);
    if (!childOuter) continue;
    const rect = childOuter.getBoundingClientRect();
    const style = getComputedStyle(childOuter);
    const marginTop = Number.parseFloat(style.marginTop) || 0;
    const marginBottom = Number.parseFloat(style.marginBottom) || 0;
    const top = rect.top - marginTop;
    const bottom = rect.bottom + marginBottom;
    if (bottom <= childAvailableBottom + LINE_TOLERANCE_PX) continue;

    if (top < childAvailableBottom - LINE_TOLERANCE_PX) {
      if (child.type === 'container') {
        const nested = measureContainerFragmentDom(childOuter, child, childAvailableBottom);
        if (nested) return nested;
      }
      if (!child.pagination?.keepTogether && child.type === 'text') {
        const text = renderedContentElement(childOuter, child.id, 'ex-text');
        const targetSplit = text
          ? measureTextFragmentDom(text, child, childAvailableBottom)
          : undefined;
        if (targetSplit) return { kind: 'container', targetNodeId: child.id, targetSplit };
      }
      if (!child.pagination?.keepTogether && child.type === 'table') {
        const table = renderedContentElement(childOuter, child.id, 'ex-table');
        const targetSplit = table instanceof HTMLTableElement
          ? measureTableFragmentDom(table, child, childAvailableBottom)
          : undefined;
        if (targetSplit) return { kind: 'container', targetNodeId: child.id, targetSplit };
      }
    }

    // No internal leaf boundary was safe. Partition the container before this
    // child; the core rejects the plan if absolutely no head content exists.
    return { kind: 'container', targetNodeId: child.id };
  }
  return undefined;
}
