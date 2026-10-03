export function cloneDataBindings(bindings) {
    return bindings ? bindings.map((binding) => structuredClone(binding)) : [];
}
export function appendDataBinding(bindings, targetProp, sourceId = 'local') {
    return [...cloneDataBindings(bindings), { targetProp, sourceId, path: '', fallback: '' }];
}
export function updateDataBinding(bindings, index, changes) {
    const next = cloneDataBindings(bindings);
    if (!next[index])
        return next;
    next[index] = { ...next[index], ...changes };
    return next;
}
export function removeDataBinding(bindings, index) {
    const next = cloneDataBindings(bindings);
    next.splice(index, 1);
    return next;
}
