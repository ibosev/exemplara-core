import { type ReadableAtom } from 'nanostores';
import { EditorSession } from './session.js';
import type { EditorComposition } from './composition.js';
import type { EditorHostConfig } from './extensions.js';
import type { ExemplaraDocument } from '../core/types.js';
export type EditorApplicationView = 'editor' | 'split' | 'json';
export interface EditorApplicationOptions<F extends Record<string, boolean>> {
    features: F;
    document: ExemplaraDocument;
    createComposition(features: F): EditorComposition;
    documentForFeatures(features: F): ExemplaraDocument;
    exclusiveFeatures?: readonly (readonly [keyof F, keyof F])[];
    host?: EditorHostConfig;
}
export interface EditorApplicationStores<F> {
    destroyed: ReadableAtom<boolean>;
    features: ReadableAtom<F>;
    view: ReadableAtom<EditorApplicationView>;
    settingsOpen: ReadableAtom<boolean>;
    session: ReadableAtom<EditorSession>;
    document: ReadableAtom<ExemplaraDocument>;
    json: ReadableAtom<string>;
    jsonKb: ReadableAtom<string>;
    enabledFeatureCount: ReadableAtom<number>;
    componentCount: ReadableAtom<number>;
}
/** Whole application state. Views subscribe; feature changes replace the owned session. */
export declare class EditorApplication<F extends Record<string, boolean>> {
    #private;
    readonly options: EditorApplicationOptions<F>;
    readonly stores: EditorApplicationStores<F>;
    constructor(options: EditorApplicationOptions<F>);
    private createSession;
    private watch;
    setView(view: EditorApplicationView): void;
    setSettingsOpen(open: boolean): void;
    setFeature<K extends keyof F>(id: K, enabled: F[K]): void;
    applyFeatures(features: F): void;
    destroy(): void;
}
