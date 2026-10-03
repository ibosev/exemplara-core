import type { ExemplaraDocument } from './types.js';
/**
 * Stable semantic capabilities understood by the editor, renderer, and hosts.
 * Product plans resolve to these ids; the package never models subscriptions.
 */
export declare const CAPABILITY_IDS: readonly ["document.edit", "document.history", "document.clipboard", "component.basic", "outline.layers", "node.context-menu", "text.rich", "preview", "data.sources.manage", "data.bind.author", "data.resolve", "design.edit", "print.layout", "print.header-footer", "print.pagination", "assets.manage", "assets.resolve", "symbols.manage", "symbols.resolve", "audit.view", "import.document.json", "import.html-css", "export.document.json", "export.pdf"];
export type CapabilityId = (typeof CAPABILITY_IDS)[number];
export type UnsupportedDocumentBehavior = 'reject' | 'read-only' | 'warn';
export interface CapabilityPolicy {
    readonly enabled: readonly CapabilityId[] | '*';
    readonly unsupportedDocument: UnsupportedDocumentBehavior;
    allows(capability: CapabilityId): boolean;
}
export interface CapabilityPolicyOptions {
    unsupportedDocument?: UnsupportedDocumentBehavior;
}
export interface DocumentCapabilityRequirement {
    capability: CapabilityId;
    path: string;
    reason: string;
    nodeId?: string;
}
export interface DocumentCapabilityAnalysis {
    requiredCapabilities: CapabilityId[];
    requirements: DocumentCapabilityRequirement[];
}
export interface UnsupportedDocumentCapability extends DocumentCapabilityRequirement {
}
export declare function createCapabilityPolicy(enabled: Iterable<CapabilityId>, options?: CapabilityPolicyOptions): CapabilityPolicy;
export declare function createAllowAllCapabilityPolicy(options?: CapabilityPolicyOptions): CapabilityPolicy;
export declare function analyzeDocumentCapabilities(document: ExemplaraDocument): DocumentCapabilityAnalysis;
export declare function findUnsupportedDocumentCapabilities(document: ExemplaraDocument, policy: CapabilityPolicy): UnsupportedDocumentCapability[];
export declare class UnsupportedDocumentCapabilitiesError extends Error {
    readonly diagnostics: readonly UnsupportedDocumentCapability[];
    constructor(diagnostics: readonly UnsupportedDocumentCapability[]);
}
export declare function assertDocumentCapabilities(document: ExemplaraDocument, policy: CapabilityPolicy): void;
