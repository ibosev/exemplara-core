import type { ExemplaraDocument } from "../core/types.js";

export const DOCUMENT_VERSION_SERVICE_ID = "exemplara.document-versions";

export type DocumentVersionKind = "snapshot" | "published";
export type DocumentVersionSource =
  | "manual"
  | "autosave"
  | "ai_apply"
  | "restore"
  | "publish"
  | "snapshot";

export interface DocumentVersionEntry {
  id: string;
  kind: DocumentVersionKind;
  source: DocumentVersionSource;
  label?: string;
  notes?: string;
  version?: string | number;
  createdAt: string;
}

export interface DocumentVersionSaveOptions {
  source: DocumentVersionSource;
  createSnapshot?: boolean;
  label?: string;
  notes?: string;
}

export interface DocumentVersionSnapshotOptions {
  label?: string;
  notes?: string;
}

export interface DocumentVersionRestoreOptions {
  currentDocument: ExemplaraDocument;
  label?: string;
}

export interface DocumentVersionSaveResult {
  savedAt?: string;
}

export interface DocumentVersionRestoreResult
  extends DocumentVersionSaveResult {
  document: ExemplaraDocument;
}

/** Host-owned persistence contract used by the portable version-history UI. */
export interface DocumentVersionService {
  /** Debounce interval for draft autosave. Defaults to 10 seconds. */
  autosaveDelayMs?: number;
  /** Maximum restore points requested by the UI. Defaults to 10. */
  maxEntries?: number;
  list(options?: { limit?: number }): Promise<readonly DocumentVersionEntry[]>;
  /** Load the complete immutable document represented by one listed version. */
  getDocument(versionId: string): Promise<ExemplaraDocument>;
  saveDraft(
    document: ExemplaraDocument,
    options: DocumentVersionSaveOptions,
  ): Promise<DocumentVersionSaveResult | void>;
  createSnapshot(
    document: ExemplaraDocument,
    options?: DocumentVersionSnapshotOptions,
  ): Promise<DocumentVersionEntry | void>;
  restore(
    versionId: string,
    options: DocumentVersionRestoreOptions,
  ): Promise<DocumentVersionRestoreResult>;
  /** Called after the editor has applied a restored document. */
  afterRestoreApplied?(result: DocumentVersionRestoreResult): void;
}

export function documentVersionSourceLabel(
  source: DocumentVersionSource,
): string {
  switch (source) {
    case "manual":
      return "Manual save";
    case "autosave":
      return "Autosave";
    case "ai_apply":
      return "AI change";
    case "restore":
      return "Restore point";
    case "publish":
      return "Published";
    default:
      return "Snapshot";
  }
}

export function documentVersionLabel(entry: DocumentVersionEntry): string {
  if (entry.label) return entry.label;
  if (entry.kind === "published")
    return `Published version ${entry.version ?? ""}`.trim();
  return `Snapshot ${entry.version ?? ""}`.trim();
}

export function isDocumentVersionService(
  value: unknown,
): value is DocumentVersionService {
  if (!value || typeof value !== "object") return false;
  const service = value as Partial<DocumentVersionService>;
  return (
    typeof service.list === "function" &&
    typeof service.getDocument === "function" &&
    typeof service.saveDraft === "function" &&
    typeof service.createSnapshot === "function" &&
    typeof service.restore === "function"
  );
}
