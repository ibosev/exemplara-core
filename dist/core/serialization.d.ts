import { type ExemplaraDocument } from './types.js';
export interface ValidationIssue {
    path: string;
    message: string;
}
export interface ValidationResult {
    valid: boolean;
    issues: ValidationIssue[];
}
export declare function validateDocument(doc: unknown): ValidationResult;
export declare function serialize(doc: ExemplaraDocument, pretty?: boolean): string;
export declare class DeserializationError extends Error {
    readonly issues: ValidationIssue[];
    constructor(message: string, issues?: ValidationIssue[]);
}
export interface DeserializeOptions {
    /** Attempt schema migration for older document versions (default true). */
    migrate?: boolean;
}
export declare function deserialize(json: string, options?: DeserializeOptions): ExemplaraDocument;
