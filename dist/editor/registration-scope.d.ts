import type { EditorSession } from "./session.js";
import type { EditorExtension, EditorExtensionApi, EditorExtensionDisposer } from "./extension-types.js";
export declare function cleanupAll(cleanups: readonly (() => void)[]): void;
/** Registrations can be suspended during a view handoff without stopping its resources. */
export declare class RegistrationScope {
    #private;
    constructor(shared?: RegistrationScope);
    register(install: () => () => void): void;
    set<T>(owner: object, key: string, read: () => T, write: (value: T) => void, value: T, same?: (a: T, b: T) => boolean): void;
    setup(extension: EditorExtension, api: EditorExtensionApi): void;
    onSession(start: (session: EditorSession) => void | EditorExtensionDisposer): void;
    start(session: EditorSession): void;
    deactivate(): void;
    activate(): void;
    dispose(): void;
}
