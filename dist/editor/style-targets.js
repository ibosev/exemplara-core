export const STYLE_MEDIA_OPTIONS = [
    { id: "all", label: "All", detail: "Global rule", mediaQuery: null },
    {
        id: "desktop",
        label: "≤ 1200px",
        detail: "Large screens and below",
        mediaQuery: "(max-width: 1200px)",
    },
    {
        id: "tablet",
        label: "≤ 900px",
        detail: "Tablet screens and below",
        mediaQuery: "(max-width: 900px)",
    },
    {
        id: "mobile",
        label: "≤ 600px",
        detail: "Phone screens and below",
        mediaQuery: "(max-width: 600px)",
    },
    {
        id: "print",
        label: "Print",
        detail: "Printed/PDF output",
        mediaQuery: "print",
    },
];
const cssIdentifier = (value) => value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
export function normalizeReusableStyleName(value) {
    return cssIdentifier(value);
}
export function componentStyleSelector(type) {
    return `.ex-${cssIdentifier(type) || "component"}`;
}
export function reusableStyleSelector(ruleId) {
    // createId() values are already valid CSS class fragments. Preserve case so
    // the selector exactly matches the class emitted by nodePresentation().
    const fragment = ruleId.trim().replace(/[^a-zA-Z0-9_-]+/g, "-");
    return `.ex-r-${fragment}`;
}
export function styleRuleState(state) {
    return state === "base" ? undefined : state;
}
export function findScopedStyleRule(rules, selector, state, mediaQuery) {
    const normalizedState = styleRuleState(state);
    return rules.find((rule) => rule.selectors.includes(selector) &&
        rule.state === normalizedState &&
        (rule.mediaQuery ?? null) === mediaQuery);
}
export function attachedStyleRuleIds(node) {
    return [
        ...new Set((node.styleBindings ?? [])
            .map((binding) => binding.ruleId)
            .filter((ruleId) => !!ruleId)),
    ];
}
export function setStyleRuleAttachment(bindings, ruleId, attached) {
    const next = structuredClone(bindings ?? []).filter((binding) => binding.ruleId !== ruleId);
    if (attached)
        next.push({ property: "", ruleId });
    return next;
}
function visitNodes(nodes, visit) {
    for (const node of nodes) {
        visit(node);
        visitNodes(node.children ?? [], visit);
        for (const slotNodes of Object.values(node.slots ?? {}))
            visitNodes(slotNodes, visit);
    }
}
function ruleUsage(document, ruleId) {
    let count = 0;
    for (const page of document.pages) {
        for (const region of Object.values(page.regions)) {
            if (!region)
                continue;
            visitNodes(region.children, (node) => {
                if (attachedStyleRuleIds(node).includes(ruleId))
                    count += 1;
            });
        }
    }
    return count;
}
/** Group all base/hover/focus/media variants of one reusable class selector. */
export function reusableStyleRuleGroups(document) {
    const groups = new Map();
    for (const rule of document.styles.rules) {
        if (!rule.name)
            continue;
        const selector = rule.selectors.find((candidate) => candidate.startsWith(".ex-r-"));
        if (!selector)
            continue;
        const variants = groups.get(selector) ?? [];
        variants.push(rule);
        groups.set(selector, variants);
    }
    return [...groups.entries()]
        .map(([selector, variants]) => {
        const base = variants.find((rule) => !rule.state && !rule.mediaQuery) ??
            variants[0];
        const ruleId = selector.slice(".ex-r-".length);
        return {
            ruleId,
            name: base.name ?? ruleId,
            selector,
            propertyCount: Object.keys(base.properties).length,
            variantCount: variants.length,
            usage: ruleUsage(document, ruleId),
        };
    })
        .sort((left, right) => left.name.localeCompare(right.name));
}
export function createReusableStyleRule(ruleId, name) {
    return {
        id: ruleId,
        name: normalizeReusableStyleName(name),
        selectors: [reusableStyleSelector(ruleId)],
        properties: {},
    };
}
