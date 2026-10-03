import { createPrintSettings } from './create.js';
import type { PrintSettings } from './types.js';

export type PrintPresetId = 'professional' | 'minimal' | 'editorial';

export interface PrintPresetDefinition {
  id: PrintPresetId;
  label: string;
  create: () => PrintSettings;
}

function createMinimalPrintSettings(): PrintSettings {
  const settings = createPrintSettings();
  settings.header.variants.default = '<div class="print-header"><span>{{document.title}}</span></div>';
  settings.footer.variants.default = '<div class="print-footer"><span>{{page.number}} / {{page.total}}</span></div>';
  settings.css = [
    '.ex-print-template { color: #52525b; font: 9px/1.3 Inter, Arial, sans-serif; }',
    '.print-header { width:100%; letter-spacing:.08em; text-transform:uppercase; }',
    '.print-footer { width:100%; display:flex; justify-content:flex-end; }',
  ].join('\n');
  return settings;
}

function createEditorialPrintSettings(): PrintSettings {
  const settings = createPrintSettings();
  settings.header.variants.default = '<div class="print-header"><strong>{{document.title}}</strong><span>{{page.label}}</span></div>';
  settings.header.variants.first = '<div class="print-header print-header--first"><strong>{{document.title}}</strong><span>First edition</span></div>';
  settings.header.variants.odd = '<div class="print-header"><span>{{page.label}}</span><strong>{{document.title}}</strong></div>';
  settings.header.variants.even = '<div class="print-header"><strong>{{document.title}}</strong><span>{{page.label}}</span></div>';
  settings.footer.variants.odd = '<div class="print-footer"><span>Page {{page.number}}</span><span>{{date}}</span></div>';
  settings.footer.variants.even = '<div class="print-footer"><span>{{date}}</span><span>Page {{page.number}}</span></div>';
  settings.css = [
    '.ex-print-template { color:#57534e; font:9px/1.35 Georgia, serif; }',
    '.print-header,.print-footer { width:100%;display:flex;align-items:center;justify-content:space-between;gap:12px; }',
    '.print-header { border-bottom:1px solid #a8a29e;padding-bottom:2.5mm; }',
    '.print-header--first { color:#0f766e;font-size:11px; }',
    '.print-footer { border-top:1px solid #d6d3d1;padding-top:2.5mm; }',
  ].join('\n');
  return settings;
}

/** Portable presets shared by the Svelte editor and headless template tools. */
export const PRINT_PRESETS: readonly PrintPresetDefinition[] = Object.freeze([
  { id: 'professional', label: 'Professional', create: createPrintSettings },
  { id: 'minimal', label: 'Minimal', create: createMinimalPrintSettings },
  { id: 'editorial', label: 'Editorial', create: createEditorialPrintSettings },
]);

export function createPrintPreset(id: PrintPresetId): PrintSettings {
  const preset = PRINT_PRESETS.find((candidate) => candidate.id === id);
  if (!preset) throw new Error(`Unknown print preset: ${String(id)}`);
  return preset.create();
}
