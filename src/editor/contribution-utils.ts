export function addUnique<T>(
  kind: string,
  entries: Map<string, T>,
  id: string,
  value: T,
): void {
  if (entries.has(id)) throw new Error(`Duplicate editor ${kind} id: ${id}`);
  entries.set(id, value);
}
