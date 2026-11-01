import type { EditorSession } from "./session.js";
import type {
  EditorExtension,
  EditorExtensionApi,
  EditorExtensionDisposer,
} from "./extension-types.js";

interface Replacement {
  active: boolean;
  previous?: Replacement;
  matches(): boolean;
  restore(): void;
}

export function cleanupAll(cleanups: readonly (() => void)[]): void {
  const errors: unknown[] = [];
  for (const cleanup of cleanups) {
    try {
      cleanup();
    } catch (error) {
      errors.push(error);
    }
  }
  if (errors.length)
    throw new AggregateError(errors, "Editor plugin cleanup failed.");
}

/** Registrations can be suspended during a view handoff without stopping its resources. */
export class RegistrationScope {
  readonly #values: WeakMap<object, Map<string, Replacement>>;
  readonly #registrations: Array<{
    install: () => () => void;
    remove: () => void;
  }> = [];
  readonly #disposers: EditorExtensionDisposer[] = [];
  readonly #starts: Array<
    (session: EditorSession) => void | EditorExtensionDisposer
  > = [];
  #active = true;
  #disposed = false;

  constructor(shared?: RegistrationScope) {
    this.#values = shared ? shared.#values : new WeakMap();
  }

  register(install: () => () => void): void {
    if (!this.#active || this.#disposed)
      throw new Error("Editor plugin registration is no longer active.");
    const remove = install();
    this.#registrations.push({ install, remove });
  }

  set<T>(
    owner: object,
    key: string,
    read: () => T,
    write: (value: T) => void,
    value: T,
    same: (a: T, b: T) => boolean = Object.is,
  ): void {
    this.register(() => {
      let values = this.#values.get(owner);
      if (!values) this.#values.set(owner, (values = new Map()));
      const previous = read();
      const current = values.get(key);
      const parent = current?.matches() ? current : undefined;
      try {
        write(value);
      } catch (error) {
        try {
          write(previous);
        } catch (cleanupError) {
          throw new AggregateError(
            [error, cleanupError],
            "Editor registration rollback failed.",
            { cause: error },
          );
        }
        throw error;
      }
      const installed = read();
      const replacement: Replacement = {
        active: true,
        previous: parent,
        matches: () => same(read(), installed),
        // An inner portable install can outlive the view whose value it replaced.
        restore: () =>
          parent && !parent.active ? parent.restore() : write(previous),
      };
      values.set(key, replacement);
      return () => {
        replacement.active = false;
        if (values.get(key) === replacement) {
          let prior = parent;
          while (prior && !prior.active) prior = prior.previous;
          if (prior) values.set(key, prior);
          else values.delete(key);
        }
        if (replacement.matches()) replacement.restore();
      };
    });
  }

  setup(extension: EditorExtension, api: EditorExtensionApi): void {
    const dispose = extension(api);
    if (dispose) this.#disposers.push(dispose);
  }

  onSession(
    start: (session: EditorSession) => void | EditorExtensionDisposer,
  ): void {
    if (this.#disposed) throw new Error("Editor plugin has been disposed.");
    this.#starts.push(start);
  }

  start(session: EditorSession): void {
    for (const start of this.#starts.splice(0)) {
      const dispose = start(session);
      if (dispose) this.#disposers.push(dispose);
    }
  }

  deactivate(): void {
    if (!this.#active) return;
    this.#active = false;
    cleanupAll([...this.#registrations].reverse().map((entry) => entry.remove));
  }

  activate(): void {
    if (this.#active || this.#disposed) return;
    this.#active = true;
    for (const entry of this.#registrations) entry.remove = entry.install();
  }

  dispose(): void {
    if (this.#disposed) return;
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
