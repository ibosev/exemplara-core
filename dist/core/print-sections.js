function fallbackSection(doc) {
    return doc.print.sections[0] ?? {
        id: 'section-default',
        label: 'Section 1',
        differentFirstPage: true,
        differentOddEven: true,
        header: { linkedToPrevious: false },
        footer: { linkedToPrevious: false },
    };
}
/** Resolve the inherited Word-style section for a physical document page. */
export function resolvePrintSection(doc, pageIndex) {
    const sections = doc.print.sections;
    let sectionIndex = 0;
    let startPageIndex = 0;
    const clampedPage = Math.max(0, Math.min(pageIndex, doc.pages.length - 1));
    for (let index = 0; index <= clampedPage; index++) {
        const sectionId = doc.pages[index]?.sectionId;
        if (!sectionId)
            continue;
        const nextIndex = sections.findIndex((section) => section.id === sectionId);
        if (nextIndex === -1 || nextIndex === sectionIndex)
            continue;
        sectionIndex = nextIndex;
        startPageIndex = index;
    }
    const section = sections[sectionIndex] ?? fallbackSection(doc);
    return {
        section,
        sectionIndex,
        startPageIndex,
        sectionPageIndex: clampedPage - startPageIndex,
        explicitStart: doc.pages[clampedPage]?.sectionId === section.id,
    };
}
function contentSectionIndex(sections, sectionIndex, position) {
    let index = sectionIndex;
    while (index > 0 && sections[index]?.[position].linkedToPrevious)
        index -= 1;
    return index;
}
/** Resolve linked content and the active first/odd/even variant for a page. */
export function resolveSectionTemplate(doc, position, pageIndex) {
    const resolvedSection = resolvePrintSection(doc, pageIndex);
    const sections = doc.print.sections;
    const ownerIndex = contentSectionIndex(sections, resolvedSection.sectionIndex, position);
    const contentSection = sections[ownerIndex] ?? fallbackSection(doc);
    const variants = contentSection[position].variants ?? doc.print[position].variants;
    const pageNumber = Math.max(0, pageIndex) + 1;
    let variant = 'default';
    if (resolvedSection.section.differentFirstPage
        && resolvedSection.sectionPageIndex === 0
        && variants.first.trim()) {
        variant = 'first';
    }
    else if (resolvedSection.section.differentOddEven) {
        const parity = pageNumber % 2 === 0 ? 'even' : 'odd';
        if (variants[parity].trim())
            variant = parity;
    }
    return {
        ...resolvedSection,
        position,
        contentSection,
        contentSectionIndex: ownerIndex,
        variants,
        variant,
        html: variants[variant] || variants.default,
    };
}
/** Clone inherited content when turning off Link to previous. */
export function materializeSectionVariants(doc, sectionId, position) {
    const pageIndex = doc.pages.findIndex((page) => page.sectionId === sectionId);
    const resolved = resolveSectionTemplate(doc, position, pageIndex === -1 ? 0 : pageIndex);
    return structuredClone(resolved.variants);
}
