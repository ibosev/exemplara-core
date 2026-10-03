import { builtinDefinitions } from './builtins.js';
import { createNode } from './create.js';
/**
 * Framework-independent component registry.
 *
 * Consumers can bridge `subscribe()` into Svelte runes or any other host
 * without coupling the registry to a UI.
 */
export class ComponentRegistry {
    #definitions = new Map();
    #listeners = new Set();
    #revision = 0;
    constructor(definitions = builtinDefinitions) {
        for (const definition of definitions)
            this.#set(definition);
    }
    get revision() {
        return this.#revision;
    }
    subscribe(listener, emitCurrent = true) {
        this.#listeners.add(listener);
        if (emitCurrent)
            listener(this.#revision);
        return () => this.#listeners.delete(listener);
    }
    #emit() {
        for (const listener of this.#listeners)
            listener(this.#revision);
    }
    #set(definition) {
        if (!definition.type)
            throw new Error('Component definition requires a type');
        this.#definitions.set(definition.type, definition);
    }
    register(definition) {
        this.#set(definition);
        this.#revision += 1;
        this.#emit();
    }
    unregister(type) {
        const removed = this.#definitions.delete(type);
        if (removed) {
            this.#revision += 1;
            this.#emit();
        }
        return removed;
    }
    get(type) {
        return this.#definitions.get(type);
    }
    has(type) {
        return this.#definitions.has(type);
    }
    get all() {
        return [...this.#definitions.values()];
    }
    get categories() {
        const grouped = new Map();
        for (const definition of this.#definitions.values()) {
            const list = grouped.get(definition.category) ?? [];
            list.push(definition);
            grouped.set(definition.category, list);
        }
        return grouped;
    }
    /** Create a node of `type` with definition defaults merged under `props`. */
    createNode(type, props = {}) {
        const definition = this.#definitions.get(type);
        const defaults = definition ? structuredClone(definition.defaultProps) : {};
        return createNode(type, { ...defaults, ...props });
    }
}
/** Shared default registry with all built-ins pre-registered. */
export const defaultRegistry = new ComponentRegistry();
