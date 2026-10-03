import type { PrintSettings } from './types.js';
export type PrintPresetId = 'professional' | 'minimal' | 'editorial';
export interface PrintPresetDefinition {
    id: PrintPresetId;
    label: string;
    create: () => PrintSettings;
}
/** Portable presets shared by the Svelte editor and headless template tools. */
export declare const PRINT_PRESETS: readonly PrintPresetDefinition[];
export declare function createPrintPreset(id: PrintPresetId): PrintSettings;
