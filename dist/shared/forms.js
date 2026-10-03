export function parseJsonValue(raw, emptyValue) {
    try {
        const value = raw.trim() === '' && arguments.length > 1 ? emptyValue : JSON.parse(raw);
        return { ok: true, value: value };
    }
    catch {
        return { ok: false, error: 'Invalid JSON' };
    }
}
export function parseJsonRecord(raw) {
    const parsed = parseJsonValue(raw, {});
    if (!parsed.ok)
        return parsed;
    if (!parsed.value || typeof parsed.value !== 'object' || Array.isArray(parsed.value)) {
        return { ok: false, error: 'Expected a JSON object' };
    }
    return { ok: true, value: parsed.value };
}
/** Import sample data from a file or paste. Objects stay as-is; lists become `{ items: [...] }`. */
export function parseImportedSampleData(raw) {
    const parsed = parseJsonValue(raw);
    if (!parsed.ok) {
        return { ok: false, error: 'This is not valid JSON. Check for a missing comma or quote.' };
    }
    const value = parsed.value;
    if (Array.isArray(value)) {
        if (value.length === 0) {
            return { ok: false, error: 'This list is empty. Add at least one record and try again.' };
        }
        return { ok: true, value: { items: value } };
    }
    if (!value || typeof value !== 'object') {
        return { ok: false, error: 'Bring an object or a list of records, not a single number or text value.' };
    }
    return { ok: true, value: value };
}
export function sampleFieldType(value) {
    if (typeof value === 'number')
        return 'number';
    if (typeof value === 'boolean')
        return 'boolean';
    if (typeof value === 'string')
        return 'string';
    return 'json';
}
export function formatSampleFieldValue(value) {
    return sampleFieldType(value) === 'json'
        ? JSON.stringify(value, null, 2)
        : String(value ?? '');
}
export function parseSampleFieldValue(raw, type) {
    if (type === 'string')
        return { ok: true, value: raw };
    if (type === 'boolean')
        return { ok: true, value: raw === 'true' };
    if (type === 'number') {
        const value = Number(raw);
        return raw.trim() !== '' && Number.isFinite(value)
            ? { ok: true, value }
            : { ok: false, error: 'Enter a valid number' };
    }
    return parseJsonValue(raw);
}
export function normalizeTokenName(value) {
    return value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
}
export function parseSelectorList(value) {
    return [...new Set(value.split(',').map((selector) => selector.trim()).filter(Boolean))];
}
