import { type ExemplaraDocument } from './types.js';
export interface Migration {
    from: string;
    to: string;
    migrate(doc: Record<string, unknown>): Record<string, unknown>;
}
export declare function registerMigration(migration: Migration): void;
export declare class MigrationError extends Error {
    constructor(message: string);
}
/**
 * Upgrade a raw parsed document to the current schema version.
 * Returns the same object when already current.
 */
export declare function migrateDocument(raw: unknown): ExemplaraDocument;
