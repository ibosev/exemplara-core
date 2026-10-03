// ============================================
// Framework-agnostic CSS box-value parsing/formatting
// (shared by the BoxModel editor in any UI framework).
// ============================================
export const ZERO_BOX = { top: 0, right: 0, bottom: 0, left: 0 };
/** Parse a CSS shorthand ("8px", "4px 8px", …) into per-side values. */
export function parseBoxValues(value) {
    if (!value)
        return { ...ZERO_BOX };
    if (typeof value === 'object')
        return { ...value };
    const parts = value
        .trim()
        .split(/\s+/)
        .map((v) => parseFloat(v) || 0);
    switch (parts.length) {
        case 1:
            return { top: parts[0], right: parts[0], bottom: parts[0], left: parts[0] };
        case 2:
            return { top: parts[0], right: parts[1], bottom: parts[0], left: parts[1] };
        case 3:
            return { top: parts[0], right: parts[1], bottom: parts[2], left: parts[1] };
        case 4:
            return { top: parts[0], right: parts[1], bottom: parts[2], left: parts[3] };
        default:
            return { ...ZERO_BOX };
    }
}
/** Format per-side values into the shortest CSS shorthand. */
export function formatBoxValues(box, unit = 'px') {
    if (box.top === box.right && box.right === box.bottom && box.bottom === box.left) {
        return `${box.top}${unit}`;
    }
    if (box.top === box.bottom && box.left === box.right) {
        return `${box.top}${unit} ${box.right}${unit}`;
    }
    return `${box.top}${unit} ${box.right}${unit} ${box.bottom}${unit} ${box.left}${unit}`;
}
export function isZeroBox(box) {
    return box.top === 0 && box.right === 0 && box.bottom === 0 && box.left === 0;
}
