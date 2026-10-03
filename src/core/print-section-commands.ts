import type { Command } from './commands.js';
import { createPrintSection } from './create.js';
import {
  materializeSectionVariants,
  resolvePrintSection,
  resolveSectionTemplate,
  type SectionTemplatePosition,
} from './print-sections.js';
import type {
  ExemplaraDocument,
  PrintSection,
  PrintTemplateVariant,
} from './types.js';

export interface PrintSectionCommandPlan {
  commands: Command[];
  sectionId?: string;
}

export function planStartPrintSection(
  doc: ExemplaraDocument,
  pageIndex: number,
): PrintSectionCommandPlan {
  const page = doc.pages[pageIndex];
  if (!page) return { commands: [] };
  const current = resolvePrintSection(doc, pageIndex);
  if (current.explicitStart && current.sectionIndex > 0) {
    return { commands: [], sectionId: current.section.id };
  }
  const sections = structuredClone(doc.print.sections);
  const section = createPrintSection({
    label: `Section ${sections.length + 1}`,
    differentFirstPage: current.section.differentFirstPage,
    differentOddEven: current.section.differentOddEven,
    header: { linkedToPrevious: true },
    footer: { linkedToPrevious: true },
  });
  sections.push(section);
  return {
    sectionId: section.id,
    commands: [
      { type: 'print:update', payload: { changes: { sections } } },
      { type: 'page:update', payload: { pageId: page.id, changes: { sectionId: section.id } } },
    ],
  };
}

export function planRemovePrintSectionBreak(
  doc: ExemplaraDocument,
  pageIndex: number,
): PrintSectionCommandPlan {
  const page = doc.pages[pageIndex];
  const current = resolvePrintSection(doc, pageIndex);
  if (!page || !current.explicitStart || current.sectionIndex === 0) return { commands: [] };
  const usedElsewhere = doc.pages.some(
    (candidate, index) => index !== pageIndex && candidate.sectionId === current.section.id,
  );
  const commands: Command[] = [
    { type: 'page:update', payload: { pageId: page.id, changes: { sectionId: undefined } } },
  ];
  if (!usedElsewhere) {
    commands.push({
      type: 'print:update',
      payload: {
        changes: {
          sections: structuredClone(doc.print.sections).filter(
            (section) => section.id !== current.section.id,
          ),
        },
      },
    });
  }
  return { commands };
}

export function planSetPrintSectionLinked(
  doc: ExemplaraDocument,
  sectionId: string,
  position: SectionTemplatePosition,
  linkedToPrevious: boolean,
): PrintSectionCommandPlan {
  const sections = structuredClone(doc.print.sections);
  const section = sections.find((candidate) => candidate.id === sectionId);
  if (!section) return { commands: [] };
  section[position].linkedToPrevious = linkedToPrevious;
  if (!linkedToPrevious && !section[position].variants) {
    section[position].variants = materializeSectionVariants(doc, sectionId, position);
  }
  return {
    sectionId,
    commands: [{ type: 'print:update', payload: { changes: { sections } } }],
  };
}

export function planUpdatePrintSection(
  doc: ExemplaraDocument,
  sectionId: string,
  changes: Partial<Pick<PrintSection, 'label' | 'differentFirstPage' | 'differentOddEven'>>,
): PrintSectionCommandPlan {
  const sections = structuredClone(doc.print.sections);
  const section = sections.find((candidate) => candidate.id === sectionId);
  if (!section) return { commands: [] };
  Object.assign(section, changes);
  return {
    sectionId,
    commands: [{ type: 'print:update', payload: { changes: { sections } } }],
  };
}

export function planUpdatePrintVariant(
  doc: ExemplaraDocument,
  position: SectionTemplatePosition,
  pageIndex: number,
  variant: PrintTemplateVariant,
  value: string,
): PrintSectionCommandPlan {
  const resolved = resolveSectionTemplate(doc, position, pageIndex);
  const owner = resolved.contentSection;
  if (!owner[position].variants) {
    const template = structuredClone(doc.print[position]);
    template.variants[variant] = value;
    return {
      sectionId: owner.id,
      commands: [{ type: 'print:update', payload: { changes: { [position]: template } } }],
    };
  }
  const sections = structuredClone(doc.print.sections);
  const target = sections.find((section) => section.id === owner.id);
  if (!target?.[position].variants) return { commands: [] };
  target[position].variants[variant] = value;
  return {
    sectionId: owner.id,
    commands: [{ type: 'print:update', payload: { changes: { sections } } }],
  };
}
