import type { ComponentDefinition, ComponentNode } from './types.js';
export type ComponentRegistryListener = (revision: number) => void;
/**
 * Framework-independent component registry.
 *
 * Consumers can bridge `subscribe()` into Svelte runes or any other host
 * without coupling the registry to a UI.
 */
export declare class ComponentRegistry {
    #private;
    constructor(definitions?: ComponentDefinition[]);
    get revision(): number;
    subscribe(listener: ComponentRegistryListener, emitCurrent?: boolean): () => void;
    register(definition: ComponentDefinition): void;
    unregister(type: string): boolean;
    get(type: string): ComponentDefinition | undefined;
    has(type: string): boolean;
    get all(): ComponentDefinition[];
    get categories(): Map<string, ComponentDefinition[]>;
    /** Create a node of `type` with definition defaults merged under `props`. */
    createNode(type: string, props?: Record<string, unknown>): ComponentNode;
}
/** Shared default registry with all built-ins pre-registered. */
export declare const defaultRegistry: ComponentRegistry;
