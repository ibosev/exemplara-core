export function addUnique(kind, entries, id, value) {
    if (entries.has(id))
        throw new Error(`Duplicate editor ${kind} id: ${id}`);
    entries.set(id, value);
}
