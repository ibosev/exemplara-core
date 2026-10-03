import { builtinDefinitions } from './builtins.js';
import { createNode } from './create.js';
import type { ComponentDefinition, ComponentNode } from './types.js';

export type ComponentRegistryListener = (revision: number) => void;

/**
 * Framework-independent component registry.
 *
 * Consumers can bridge `subscribe()` into Svelte runes or any other host
 * without coupling the registry to a UI.
 */
export class ComponentRegistry {
  readonly #definitions = new Map<string, ComponentDefinition>();
  readonly #listeners = new Set<ComponentRegistryListener>();
  #revision = 0;

  constructor(definitions: ComponentDefinition[] = builtinDefinitions) {
    for (const definition of definitions) this.#set(definition);
  }

  get revision(): number {
    return this.#revision;
  }

  subscribe(listener: ComponentRegistryListener, emitCurrent = true): () => void {
    this.#listeners.add(listener);
    if (emitCurrent) listener(this.#revision);
    return () => this.#listeners.delete(listener);
  }

  #emit(): void {
    for (const listener of this.#listeners) listener(this.#revision);
  }

  #set(definition: ComponentDefinition): void {
    if (!definition.type) throw new Error('Component definition requires a type');
    this.#definitions.set(definition.type, definition);
  }

  register(definition: ComponentDefinition): void {
    this.#set(definition);
    this.#revision += 1;
    this.#emit();
  }

  unregister(type: string): boolean {
    const removed = this.#definitions.delete(type);
    if (removed) {
      this.#revision += 1;
      this.#emit();
    }
    return removed;
  }

  get(type: string): ComponentDefinition | undefined {
    return this.#definitions.get(type);
  }

  has(type: string): boolean {
    return this.#definitions.has(type);
  }

  get all(): ComponentDefinition[] {
    return [...this.#definitions.values()];
  }

  get categories(): Map<string, ComponentDefinition[]> {
    const grouped = new Map<string, ComponentDefinition[]>();
    for (const definition of this.#definitions.values()) {
      const list = grouped.get(definition.category) ?? [];
      list.push(definition);
      grouped.set(definition.category, list);
    }
    return grouped;
  }

  /** Create a node of `type` with definition defaults merged under `props`. */
  createNode(type: string, props: Record<string, unknown> = {}): ComponentNode {
    const definition = this.#definitions.get(type);
    const defaults = definition ? structuredClone(definition.defaultProps) : {};
    return createNode(type, { ...defaults, ...props });
  }
}

/** Shared default registry with all built-ins pre-registered. */
export const defaultRegistry = new ComponentRegistry();
