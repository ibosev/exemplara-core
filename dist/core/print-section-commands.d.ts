import type { Command } from './commands.js';
import { type SectionTemplatePosition } from './print-sections.js';
import type { ExemplaraDocument, PrintSection, PrintTemplateVariant } from './types.js';
export interface PrintSectionCommandPlan {
    commands: Command[];
    sectionId?: string;
}
export declare function planStartPrintSection(doc: ExemplaraDocument, pageIndex: number): PrintSectionCommandPlan;
export declare function planRemovePrintSectionBreak(doc: ExemplaraDocument, pageIndex: number): PrintSectionCommandPlan;
export declare function planSetPrintSectionLinked(doc: ExemplaraDocument, sectionId: string, position: SectionTemplatePosition, linkedToPrevious: boolean): PrintSectionCommandPlan;
export declare function planUpdatePrintSection(doc: ExemplaraDocument, sectionId: string, changes: Partial<Pick<PrintSection, 'label' | 'differentFirstPage' | 'differentOddEven'>>): PrintSectionCommandPlan;
export declare function planUpdatePrintVariant(doc: ExemplaraDocument, position: SectionTemplatePosition, pageIndex: number, variant: PrintTemplateVariant, value: string): PrintSectionCommandPlan;
