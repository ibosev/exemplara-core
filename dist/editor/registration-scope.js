export function cleanupAll(cleanups) {
    const errors = [];
    for (const cleanup of cleanups) {
        try {
            cleanup();
        }
        catch (error) {
            errors.push(error);
        }
    }
    if (errors.length)
        throw new AggregateError(errors, "Editor plugin cleanup failed.");
}
/** Registrations can be suspended during a view handoff without stopping its resources. */
export class RegistrationScope {
    #values;
    #registrations = [];
    #disposers = [];
    #starts = [];
    #active = true;
    #disposed = false;
    constructor(shared) {
        this.#values = shared ? shared.#values : new WeakMap();
    }
    register(install) {
        if (!this.#active || this.#disposed)
            throw new Error("Editor plugin registration is no longer active.");
        const remove = install();
        this.#registrations.push({ install, remove });
    }
    set(owner, key, read, write, value, same = Object.is) {
        this.register(() => {
            let values = this.#values.get(owner);
            if (!values)
                this.#values.set(owner, (values = new Map()));
            const previous = read();
            const current = values.get(key);
            const parent = current?.matches() ? current : undefined;
            try {
                write(value);
            }
            catch (error) {
                try {
                    write(previous);
                }
                catch (cleanupError) {
                    throw new AggregateError([error, cleanupError], "Editor registration rollback failed.", { cause: error });
                }
                throw error;
            }
            const installed = read();
            const replacement = {
                active: true,
                previous: parent,
                matches: () => same(read(), installed),
                // An inner portable install can outlive the view whose value it replaced.
                restore: () => parent && !parent.active ? parent.restore() : write(previous),
            };
            values.set(key, replacement);
            return () => {
                replacement.active = false;
                if (values.get(key) === replacement) {
                    let prior = parent;
                    while (prior && !prior.active)
                        prior = prior.previous;
                    if (prior)
                        values.set(key, prior);
                    else
                        values.delete(key);
                }
                if (replacement.matches())
                    replacement.restore();
            };
        });
    }
    setup(extension, api) {
        const dispose = extension(api);
        if (dispose)
            this.#disposers.push(dispose);
    }
    onSession(start) {
        if (this.#disposed)
            throw new Error("Editor plugin has been disposed.");
        this.#starts.push(start);
    }
    start(session) {
        for (const start of this.#starts.splice(0)) {
            const dispose = start(session);
            if (dispose)
                this.#disposers.push(dispose);
        }
    }
    deactivate() {
        if (!this.#active)
            return;
        this.#active = false;
        cleanupAll([...this.#registrations].reverse().map((entry) => entry.remove));
    }
    activate() {
        if (this.#active || this.#disposed)
            return;
        this.#active = true;
        for (const entry of this.#registrations)
            entry.remove = entry.install();
    }
    dispose() {
        if (this.#disposed)
            return;
        this.#disposed = true;
        this.#starts.length = 0;
        cleanupAll([
            () => this.deactivate(),
            ...this.#disposers.splice(0).reverse(),
            () => {
                this.#registrations.length = 0;
            },
        ]);
    }
}
