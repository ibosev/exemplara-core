import type { ExemplaraDocument } from '../core/types.js';
export type AuditSeverity = 'error' | 'warning';
export interface AuditIssue {
    severity: AuditSeverity;
    rule: string;
    message: string;
    nodeId: string;
    pageId: string;
}
export interface AuditOptions {
    /** Default page background used when no container background applies. */
    pageBackground?: string;
    /** Minimum readable font size in px. */
    minFontSize?: number;
}
/** Run all audit rules over the document. */
export declare function auditDocument(doc: ExemplaraDocument, options?: AuditOptions): AuditIssue[];
