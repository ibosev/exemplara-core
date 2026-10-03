import type { DataBinding } from '../core/types.js';

export function cloneDataBindings(bindings?: readonly DataBinding[]): DataBinding[] {
  return bindings ? bindings.map((binding) => structuredClone(binding)) : [];
}

export function appendDataBinding(
  bindings: readonly DataBinding[] | undefined,
  targetProp: string,
  sourceId = 'local',
): DataBinding[] {
  return [...cloneDataBindings(bindings), { targetProp, sourceId, path: '', fallback: '' }];
}

export function updateDataBinding(
  bindings: readonly DataBinding[] | undefined,
  index: number,
  changes: Partial<DataBinding>,
): DataBinding[] {
  const next = cloneDataBindings(bindings);
  if (!next[index]) return next;
  next[index] = { ...next[index], ...changes };
  return next;
}

export function removeDataBinding(
  bindings: readonly DataBinding[] | undefined,
  index: number,
): DataBinding[] {
  const next = cloneDataBindings(bindings);
  next.splice(index, 1);
  return next;
}
