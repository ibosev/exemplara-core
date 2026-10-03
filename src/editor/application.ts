import { atom, batch, computed, readonlyType, type ReadableAtom } from 'nanostores';
import { EditorSession } from './session.js';
import type { EditorComposition } from './composition.js';
import type { EditorHostConfig } from './extensions.js';
import type { ExemplaraDocument } from '../core/types.js';
import { serialize } from '../core/serialization.js';
import { visitNodes } from '../core/tree.js';

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
export class EditorApplication<F extends Record<string, boolean>> {
  readonly #features;
  readonly #view = atom<EditorApplicationView>('editor');
  readonly #settingsOpen = atom(false);
  readonly #session;
  readonly #engineState;
  #stop: () => void;
  readonly #disposed = atom(false);
  readonly stores: EditorApplicationStores<F>;
  constructor(readonly options: EditorApplicationOptions<F>) {
    this.#features = atom(structuredClone(options.features));
    this.#session = atom(this.createSession(options.features, options.document));
    this.#engineState = atom(this.#session.get().stores.engineState.get());
    this.#stop = this.watch(this.#session.get());
    const document = computed(this.#engineState, state => state.document);
    const json = computed(document, value => serialize(value, true));
    this.stores = {
      destroyed: readonlyType(this.#disposed),
      features: readonlyType(this.#features),
      view: readonlyType(this.#view),
      settingsOpen: readonlyType(this.#settingsOpen),
      session: readonlyType(this.#session),
      document: readonlyType(document),
      json: readonlyType(json),
      jsonKb: readonlyType(computed(json, value => (value.length / 1024).toFixed(1))),
      enabledFeatureCount: readonlyType(computed(this.#features, flags => Object.values(flags).filter(Boolean).length)),
      componentCount: readonlyType(computed(document, value => { let count = 0; visitNodes(value, () => { count++; }); return count; })),
    };
  }
  private createSession(features: F, document: ExemplaraDocument): EditorSession {
    return new EditorSession({ composition: this.options.createComposition(features), document, host: this.options.host });
  }
  private watch(session: EditorSession): () => void {
    return session.stores.engineState.listen(state => { if (!this.#disposed.get() && this.#session.get() === session) this.#engineState.set(state); });
  }
  setView(view: EditorApplicationView): void { if (!this.#disposed.get()) this.#view.set(view); }
  setSettingsOpen(open: boolean): void { if (!this.#disposed.get()) this.#settingsOpen.set(open); }
  setFeature<K extends keyof F>(id: K, enabled: F[K]): void {
    if (this.#disposed.get()) return;
    const features: F = { ...this.#features.get() };
    features[id] = enabled;
    if (enabled) for (const [left, right] of this.options.exclusiveFeatures ?? []) {
      if (id === left) features[right] = false as F[keyof F];
      if (id === right) features[left] = false as F[keyof F];
    }
    this.applyFeatures(features);
  }
  applyFeatures(features: F): void {
    if (this.#disposed.get()) return;
    const next = structuredClone(features);
    const replacement = this.createSession(next, this.options.documentForFeatures(next));
    batch(() => {
      const previous = this.#session.get();
      this.#stop();
      this.#features.set(next);
      this.#session.set(replacement);
      this.#engineState.set(replacement.stores.engineState.get());
      this.#stop = this.watch(replacement);
      previous.destroy();
    });
  }
  destroy(): void {
    if (this.#disposed.get()) return;
    this.#disposed.set(true);
    this.#stop();
    this.#session.get().destroy();
  }
}
