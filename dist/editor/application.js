import { atom, batch, computed, readonlyType } from 'nanostores';
import { EditorSession } from './session.js';
import { serialize } from '../core/serialization.js';
import { visitNodes } from '../core/tree.js';
/** Whole application state. Views subscribe; feature changes replace the owned session. */
export class EditorApplication {
    options;
    #features;
    #view = atom('editor');
    #settingsOpen = atom(false);
    #session;
    #engineState;
    #stop;
    #disposed = atom(false);
    stores;
    constructor(options) {
        this.options = options;
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
    createSession(features, document) {
        return new EditorSession({ composition: this.options.createComposition(features), document, host: this.options.host });
    }
    watch(session) {
        return session.stores.engineState.listen(state => { if (!this.#disposed.get() && this.#session.get() === session)
            this.#engineState.set(state); });
    }
    setView(view) { if (!this.#disposed.get())
        this.#view.set(view); }
    setSettingsOpen(open) { if (!this.#disposed.get())
        this.#settingsOpen.set(open); }
    setFeature(id, enabled) {
        if (this.#disposed.get())
            return;
        const features = { ...this.#features.get() };
        features[id] = enabled;
        if (enabled)
            for (const [left, right] of this.options.exclusiveFeatures ?? []) {
                if (id === left)
                    features[right] = false;
                if (id === right)
                    features[left] = false;
            }
        this.applyFeatures(features);
    }
    applyFeatures(features) {
        if (this.#disposed.get())
            return;
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
    destroy() {
        if (this.#disposed.get())
            return;
        this.#disposed.set(true);
        this.#stop();
        this.#session.get().destroy();
    }
}
