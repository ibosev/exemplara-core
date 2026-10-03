import { DOCUMENT_VERSION, type ExemplaraDocument } from './types.js';
import {
  createDefaultTokens,
  createPaginationSettings,
  createPrintSection,
  createPrintSettings,
} from './create.js';

// ============================================
// Schema migrations.
//
// Every document carries a version. `migrateDocument` upgrades any known
// older format to the current one by chaining registered migrations.
// A built-in migration imports legacy Exemplara 0.1.0 documents, whose AST
// is structurally compatible.
// ============================================

export interface Migration {
  from: string;
  to: string;
  migrate(doc: Record<string, unknown>): Record<string, unknown>;
}

const migrations = new Map<string, Migration>();

export function registerMigration(migration: Migration): void {
  migrations.set(migration.from, migration);
}

export class MigrationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MigrationError';
  }
}

/**
 * Upgrade a raw parsed document to the current schema version.
 * Returns the same object when already current.
 */
export function migrateDocument(raw: unknown): ExemplaraDocument {
  if (typeof raw !== 'object' || raw === null) {
    throw new MigrationError('Document must be an object');
  }
  let doc = raw as Record<string, unknown>;
  const seen = new Set<string>();

  while (doc.version !== DOCUMENT_VERSION) {
    const version = String(doc.version);
    if (seen.has(version)) {
      throw new MigrationError(`Migration cycle detected at version ${version}`);
    }
    seen.add(version);

    const migration = migrations.get(version);
    if (!migration) {
      throw new MigrationError(`No migration path from version ${version} to ${DOCUMENT_VERSION}`);
    }
    doc = migration.migrate(structuredClone(doc));
    doc.version = migration.to;
  }

  return doc as unknown as ExemplaraDocument;
}

// --- Built-in: legacy Exemplara 0.1.0 (original package) → 1.0.0 ---

registerMigration({
  from: '0.1.0',
  to: '1.0.0',
  migrate(doc) {
    doc.pages ??= [];
    doc.dataSources ??= [];
    doc.assets ??= [];
    doc.symbols ??= [];

    const styles = (doc.styles ?? {}) as Record<string, unknown>;
    const defaults = createDefaultTokens();
    const tokens = (styles.tokens ?? {}) as Record<string, unknown>;
    styles.tokens = {
      colors: tokens.colors ?? defaults.colors,
      typography: tokens.typography ?? defaults.typography,
      spacing: tokens.spacing ?? defaults.spacing,
      fonts: tokens.fonts ?? [],
    };
    styles.rules ??= [];
    doc.styles = styles;

    const meta = (doc.meta ?? {}) as Record<string, unknown>;
    const now = new Date().toISOString();
    meta.createdAt ??= now;
    meta.updatedAt ??= now;
    doc.meta = meta;

    return doc;
  },
});

// --- 1.0.0 → 1.1.0: browser PDF header/footer templates ---

registerMigration({
  from: '1.0.0',
  to: '1.1.0',
  migrate(doc) {
    doc.print ??= createPrintSettings();
    return doc;
  },
});

// --- 1.1.0 → 1.2.0: Word-like automatic sheet flow settings ---

registerMigration({
  from: '1.1.0',
  to: '1.2.0',
  migrate(doc) {
    doc.pagination ??= createPaginationSettings();
    return doc;
  },
});

// --- 1.2.0 → 1.3.0: component fragmentation and pagination rules ---

registerMigration({
  from: '1.2.0',
  to: '1.3.0',
  migrate(doc) {
    // Node pagination and flow metadata are optional, so older documents need
    // no structural rewrite. The explicit step keeps the migration chain sound.
    return doc;
  },
});

// --- 1.3.0 → 1.4.0: print sections and paragraph geometry ---

registerMigration({
  from: '1.3.0',
  to: '1.4.0',
  migrate(doc) {
    const print = (doc.print ?? createPrintSettings()) as Record<string, unknown>;
    print.sections ??= [createPrintSection({ label: 'Section 1' })];
    doc.print = print;
    // Page section ids and node paragraph settings are optional.
    return doc;
  },
});

// --- 1.4.0 → 1.5.0: explicit print/web document medium ---

registerMigration({
  from: '1.4.0',
  to: DOCUMENT_VERSION,
  migrate(doc) {
    const meta = (doc.meta ?? {}) as Record<string, unknown>;
    meta.medium ??= 'print';
    doc.meta = meta;
    return doc;
  },
});
