/** Write a design-token value back onto a matching CSS custom property. */
export function applyCssCustomProperty(css, property, value) {
    const name = property.startsWith('--') ? property : `--${property}`;
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return css.replace(new RegExp(`(${escaped}\\s*:\\s*)([^;}]+)`, 'gi'), `$1${value}`);
}
/** Replace every custom property whose name matches `namePattern`. */
export function applyCssCustomPropertiesMatching(css, namePattern, value) {
    return css.replace(/--([A-Za-z0-9_-]+)\s*:\s*([^;}]+)/g, (full, name) => {
        const test = new RegExp(namePattern.source, namePattern.flags.replaceAll('g', ''));
        return test.test(name) ? `--${name}: ${value}` : full;
    });
}
/** Inline custom properties freeze imported template colors above the Design panel. */
export function stripCssCustomProperties(style) {
    return style
        .replace(/(?:^|;)\s*--[A-Za-z_][\w-]*\s*:[^;]*/g, '')
        .replace(/^[;\s]+|[;\s]+$/g, '')
        .trim();
}
export function cssCustomPropertyDeclarations(colors) {
    return Object.entries(colors)
        .map(([name, value]) => `--color-${name}: ${value}; --${name}: ${value}`)
        .join('; ');
}
export function themePrefixFromPageToken(name) {
    const match = name.toLowerCase().match(/^([a-z0-9]+)-(?:bg|page|background)$/);
    return match?.[1] ?? null;
}
function mixToken(tokenVar, amount) {
    return `color-mix(in srgb, var(${tokenVar}) ${Math.max(0, Math.min(100, amount))}%, transparent)`;
}
/** Point leftover baked greys/golds at the template's design tokens. */
export function harmonizeThemeColorValue(value, prefix) {
    const bg = `--${prefix}-bg`;
    const text = `--${prefix}-text`;
    const accent = `--${prefix}-accent`;
    const border = `--${prefix}-border`;
    return value
        .replace(/rgba\(\s*2\s*,\s*2\s*,\s*2\s*,\s*(0?\.\d+)\s*\)/gi, (_, alpha) => mixToken(bg, Math.round(Number(alpha) * 100)))
        .replace(/rgba\(\s*5\s*,\s*5\s*,\s*5\s*,\s*(0?\.\d+)\s*\)/gi, (_, alpha) => mixToken(bg, Math.round(Number(alpha) * 100)))
        .replace(/rgba\(\s*10\s*,\s*10\s*,\s*10\s*,\s*(0?\.\d+)\s*\)/gi, (_, alpha) => mixToken(bg, Math.round(Number(alpha) * 100)))
        .replace(/rgba\(\s*16\s*,\s*16\s*,\s*16\s*,\s*(0?\.\d+)\s*\)/gi, (_, alpha) => mixToken(bg, Math.round(Number(alpha) * 100)))
        .replace(/rgba\(\s*18\s*,\s*18\s*,\s*18\s*,\s*(0?\.\d+)\s*\)/gi, (_, alpha) => mixToken(bg, Math.round(Number(alpha) * 100)))
        .replace(/rgba\(\s*244\s*,\s*237\s*,\s*222\s*,\s*(0?\.\d+)\s*\)/gi, (_, alpha) => mixToken(text, Math.round(Number(alpha) * 100)))
        .replace(/rgba\(\s*212\s*,\s*179\s*,\s*116\s*,\s*(0?\.\d+)\s*\)/gi, (_, alpha) => mixToken(accent, Math.round(Number(alpha) * 100)))
        .replace(/rgba\(\s*236\s*,\s*219\s*,\s*181\s*,\s*(0?\.\d+)\s*\)/gi, (_, alpha) => mixToken(border, Math.round(Number(alpha) * 100)));
}
export function harmonizeTemplateThemeCss(css, prefix) {
    const next = harmonizeThemeColorValue(css, prefix)
        .replace(new RegExp(`--${prefix}-surface\\s*:\\s*(?!var\\(|color-mix)[^;]+`, 'gi'), `--${prefix}-surface: color-mix(in srgb, var(--${prefix}-bg) 82%, transparent)`)
        .replace(new RegExp(`--${prefix}-panel\\s*:\\s*(?!var\\(|color-mix)[^;]+`, 'gi'), `--${prefix}-panel: color-mix(in srgb, var(--${prefix}-bg) 88%, white)`);
    return next;
}
export function derivedSurfaceToken(prefix) {
    return `color-mix(in srgb, var(--color-${prefix}-bg) 82%, transparent)`;
}
export function derivedPanelToken(prefix) {
    return `color-mix(in srgb, var(--color-${prefix}-bg) 88%, white)`;
}
export function isPageBackgroundTokenName(name) {
    const normalized = name.toLowerCase();
    if (/(?:^|-)(?:nav|button|btn|surface|panel|card|header|footer|topbar)(?:-|$)/.test(normalized))
        return false;
    return /(?:^|-)(?:bg|page|background)$/.test(normalized);
}
export function isDarkColorSample(value) {
    const hex = value.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if (!hex) {
        const rgb = value.trim().match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
        if (!rgb)
            return true;
        const [r, g, b] = [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
        return (r * 299 + g * 587 + b * 114) / 1000 < 140;
    }
    let digits = hex[1];
    if (digits.length === 3)
        digits = digits.split('').map((part) => part + part).join('');
    const r = parseInt(digits.slice(0, 2), 16);
    const g = parseInt(digits.slice(2, 4), 16);
    const b = parseInt(digits.slice(4, 6), 16);
    return (r * 299 + g * 587 + b * 114) / 1000 < 140;
}
function pageBackgroundFill(tokenVar, sample) {
    return isDarkColorSample(sample)
        ? `linear-gradient(180deg, color-mix(in srgb, var(${tokenVar}) 92%, black) 0%, var(${tokenVar}) 40%, var(${tokenVar}) 100%)`
        : `linear-gradient(180deg, color-mix(in srgb, var(${tokenVar}) 88%, white) 0%, var(${tokenVar}) 100%)`;
}
function splitCssLayers(value) {
    const layers = [];
    let depth = 0;
    let current = '';
    for (const character of value) {
        if (character === '(')
            depth += 1;
        else if (character === ')')
            depth = Math.max(0, depth - 1);
        if (character === ',' && depth === 0) {
            if (current.trim())
                layers.push(current.trim());
            current = '';
            continue;
        }
        current += character;
    }
    if (current.trim())
        layers.push(current.trim());
    return layers;
}
function shouldRetieBackgroundLayer(layer) {
    if (/var\s*\(/i.test(layer) || /url\s*\(/i.test(layer))
        return false;
    return /linear-gradient/i.test(layer) || /^(?:#|rgba?\(|hsla?\()/i.test(layer.trim());
}
/**
 * Older forks baked `color-mix(var(--mujo-bg), black)` into hex stops, so the
 * Design panel's page token no longer paints the template. Re-attach those
 * root backgrounds to the live token.
 */
export function retieBakedRootBackgrounds(css, cssVar, tokenVar, sample) {
    const fill = pageBackgroundFill(tokenVar, sample);
    return css.replace(/((?:^|})(\s*)(?:html|body|:root)(?:\.[A-Za-z_][\w-]*)*\s*\{)([^}]*)/gi, (full, open, _space, body) => {
        if (!/background\s*:/i.test(body)) {
            if (!/\bbody\b/i.test(open))
                return full;
            return `${open}${body}\n  background: ${fill};`;
        }
        return `${open}${body.replace(/background(?:-image|-color)?\s*:\s*([^;}]+)/gi, (declaration, value) => {
            const layers = splitCssLayers(value);
            let replaced = false;
            const next = layers.map((layer) => {
                if (!shouldRetieBackgroundLayer(layer))
                    return layer;
                replaced = true;
                return fill;
            });
            return replaced ? `background: ${next.join(', ')}` : declaration;
        })}`;
    });
}
/** Keep imported template CSS (`--mujo-bg`, `--quay-page`, …) in sync with the Design panel. */
export function syncWebCustomCssFromToken(customCss, path, value) {
    const raw = String(value);
    const segments = path.split('.');
    if (segments[0] === 'colors' && segments.length === 2 && segments[1]) {
        const name = segments[1];
        let next = applyCssCustomProperty(applyCssCustomProperty(customCss, `--${name}`, raw), `--color-${name}`, raw);
        if (isPageBackgroundTokenName(name)) {
            next = retieBakedRootBackgrounds(next, `--${name}`, `--color-${name}`, raw);
        }
        return next;
    }
    if (segments[0] === 'typography' && segments[1] === 'heading' && segments[2] === 'fontFamily') {
        return applyCssCustomPropertiesMatching(customCss, /(?:^|-)font-heading$|(?:^|-)font(?:-.*)?-head(?:ing)?$/i, raw);
    }
    if (segments[0] === 'typography' && segments[1] === 'body' && segments[2] === 'fontFamily') {
        return applyCssCustomPropertiesMatching(customCss, /(?:^|-)font-body$|(?:^|-)font(?:-.*)?-body$/i, raw);
    }
    if (segments[0] === 'typography' && segments[1] === 'body' && segments[2] === 'fontSize') {
        return applyCssCustomPropertiesMatching(customCss, /(?:^|-)font-size$/i, raw);
    }
    return customCss;
}
