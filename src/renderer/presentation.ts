import type { ComponentNode } from '../core/types.js';

export interface NodePresentation {
  classes: string[];
  style: Record<string, string | number | undefined>;
}

export const stringValue = (value: unknown, fallback = ''): string =>
  value === undefined || value === null ? fallback : String(value);

export const numberValue = (value: unknown, fallback: number): number => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

/** Merge rule/value bindings over a renderer's built-in presentation. */
export function nodePresentation(
  node: ComponentNode,
  baseClass: string,
  style: Record<string, string | number | undefined> = {},
): NodePresentation {
  const authoredClasses = stringValue(node.props.className)
    .split(/\s+/)
    .filter((name) => /^[A-Za-z_][A-Za-z0-9_-]*$/.test(name));
  const classes = [baseClass, ...authoredClasses];
  const merged = { ...style };
  for (const binding of node.styleBindings ?? []) {
    if (binding.ruleId) classes.push(`ex-r-${binding.ruleId}`);
    if (binding.value !== undefined) merged[binding.property] = binding.value;
  }
  return { classes, style: merged };
}

export function containerPresentation(node: ComponentNode): NodePresentation {
  const {
    direction,
    gap,
    padding,
    background,
    align,
    justify,
    width,
    maxWidth,
    minHeight,
    wrap,
    color,
    border,
    borderRadius,
    overflow,
    position,
  } = node.props;
  const flexDirection = stringValue(direction);
  const flexWrap = stringValue(wrap);
  const usesFlex = Boolean(flexDirection || flexWrap);
  return nodePresentation(node, 'ex-container', {
    display: usesFlex ? 'flex' : undefined,
    'flex-direction': flexDirection || undefined,
    'flex-wrap': flexWrap || undefined,
    gap: gap ? `${numberValue(gap, 0)}px` : undefined,
    padding: padding ? `${numberValue(padding, 0)}px` : undefined,
    background: stringValue(background) || undefined,
    color: stringValue(color) || undefined,
    width: stringValue(width) || undefined,
    'max-width': stringValue(maxWidth) || undefined,
    'min-height': minHeight ? `${numberValue(minHeight, 0)}px` : undefined,
    margin: stringValue(maxWidth) ? '0 auto' : undefined,
    border: stringValue(border) || undefined,
    'border-radius': stringValue(borderRadius) || undefined,
    overflow: stringValue(overflow) || undefined,
    position: stringValue(position) || undefined,
    'align-items': stringValue(align) || undefined,
    'justify-content': stringValue(justify) || undefined,
  });
}

export function columnsPresentation(node: ComponentNode): NodePresentation {
  return nodePresentation(node, 'ex-columns', {
    display: 'flex',
    gap: `${numberValue(node.props.gap, 16)}px`,
    width: '100%',
  });
}

export function columnPresentation(
  ratiosValue: unknown,
  gapValue: unknown,
  index: number,
): NodePresentation {
  const ratios = Array.isArray(ratiosValue) ? ratiosValue as number[] : [1, 1];
  const gap = numberValue(gapValue, 16);
  const total = ratios.reduce((sum, ratio) => sum + (Number(ratio) || 1), 0) || 1;
  const ratio = Number(ratios[index]) || 1;
  const width = `${Math.round(((ratio / total) * 100) * 1_000_000) / 1_000_000}%`;
  return {
    classes: ['ex-column'],
    style: { flex: `0 0 calc(${width} - ${gap}px)` },
  };
}
