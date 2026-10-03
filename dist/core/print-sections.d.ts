import type { ExemplaraDocument, PrintSection, PrintTemplateVariant, PrintTemplateVariants } from './types.js';
export type SectionTemplatePosition = 'header' | 'footer';
export interface ResolvedPrintSection {
    section: PrintSection;
    sectionIndex: number;
    startPageIndex: number;
    sectionPageIndex: number;
    explicitStart: boolean;
}
export interface ResolvedSectionTemplate extends ResolvedPrintSection {
    position: SectionTemplatePosition;
    contentSection: PrintSection;
    contentSectionIndex: number;
    variants: PrintTemplateVariants;
    variant: PrintTemplateVariant;
    html: string;
}
/** Resolve the inherited Word-style section for a physical document page. */
export declare function resolvePrintSection(doc: ExemplaraDocument, pageIndex: number): ResolvedPrintSection;
/** Resolve linked content and the active first/odd/even variant for a page. */
export declare function resolveSectionTemplate(doc: ExemplaraDocument, position: SectionTemplatePosition, pageIndex: number): ResolvedSectionTemplate;
/** Clone inherited content when turning off Link to previous. */
export declare function materializeSectionVariants(doc: ExemplaraDocument, sectionId: string, position: SectionTemplatePosition): PrintTemplateVariants;
