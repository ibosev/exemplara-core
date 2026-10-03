import type { ComponentNode, DataBinding } from '../core/types.js';
import type { DataValueType, SampleDataPath } from './data-browser.js';

export interface TableColumnValue {
  key: string;
  label?: string;
  format?: string;
}

export interface TableDataSelection {
  mode: 'connected' | 'manual' | 'empty';
  binding?: DataBinding;
  path?: SampleDataPath;
  rows: unknown[];
}

export function tableColumns(node: ComponentNode): TableColumnValue[] {
  if (!Array.isArray(node.props.columns)) return [];
  return node.props.columns.flatMap((value) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
    const record = value as Record<string, unknown>;
    const key = String(record.key ?? '').trim();
    if (!key) return [];
    const label = String(record.label ?? '').trim();
    const format = String(record.format ?? '').trim();
    return [{ key, label: label || undefined, format: format || undefined }];
  });
}

export function tableArrayPaths(paths: readonly SampleDataPath[]): SampleDataPath[] {
  return paths.filter((path) => path.type === 'array');
}

/** Resolve the canonical table DataBinding or manual rows stored in props. */
export function resolveTableDataSelection(
  node: ComponentNode,
  paths: readonly SampleDataPath[],
): TableDataSelection {
  const binding = node.dataBindings?.find((candidate) => candidate.targetProp === 'rows');
  if (binding) {
    const path = paths.find((candidate) =>
      candidate.sourceId === binding.sourceId && candidate.path === binding.path);
    const rows = path && Array.isArray(path.value)
      ? path.value
      : Array.isArray(binding.fallback) ? binding.fallback : [];
    return { mode: 'connected', binding, path, rows };
  }

  const rows = Array.isArray(node.props.rows) ? node.props.rows : [];
  return { mode: rows.length ? 'manual' : 'empty', rows };
}

/** Field names seen in representative object rows, in stable source order. */
export function tableRowFields(rows: readonly unknown[]): string[] {
  const fields = new Set<string>();
  for (const row of rows.slice(0, 20)) {
    if (!row || typeof row !== 'object' || Array.isArray(row)) continue;
    for (const key of Object.keys(row)) fields.add(key);
  }
  return [...fields];
}

export function replaceBindingTarget(
  bindings: readonly DataBinding[] | undefined,
  targetProp: string,
  replacement?: DataBinding,
): DataBinding[] | undefined {
  const remaining = (bindings ?? [])
    .filter((binding) => binding.targetProp !== targetProp)
    .map((binding) => structuredClone(binding));
  if (replacement) remaining.push(structuredClone(replacement));
  return remaining.length ? remaining : undefined;
}

/** Choose the safe primary target for the Data panel's point-and-click binding. */
export function preferredBindingTarget(
  nodeType: string,
  propNames: readonly string[],
  pathType: DataValueType,
): string | null {
  if (nodeType === 'table') return pathType === 'array' ? 'rows' : null;
  if (propNames.includes('content')) return 'content';
  return propNames[0] ?? null;
}
