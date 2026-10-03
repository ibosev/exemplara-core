import { type BoxSpacing, type ComponentNode, type DesignTokens, type ExemplaraDocument, type Orientation, type Page, type PageSize, type PaginationSettings, type PrintSettings, type PrintSection, type Region, type StyleSheet } from './types.js';
export declare function createRegion(init?: Partial<Omit<Region, 'id'>>): Region;
export interface CreatePageInit {
    label?: string;
    size?: PageSize;
    orientation?: Orientation;
    margins?: BoxSpacing;
    withHeader?: boolean;
    withFooter?: boolean;
    withBackground?: boolean;
}
export declare function createPage(init?: CreatePageInit): Page;
export declare function createDefaultTokens(): DesignTokens;
export declare function createStyleSheet(): StyleSheet;
export declare function createPrintSettings(): PrintSettings;
export declare function createPrintSection(init?: Partial<Omit<PrintSection, 'id'>>): PrintSection;
export declare function createPaginationSettings(): PaginationSettings;
export interface CreateDocumentInit {
    name?: string;
    author?: string;
    medium?: ExemplaraDocument['meta']['medium'];
    /** When true (default) the document starts with one empty A4 page. */
    withInitialPage?: boolean;
}
export declare function createDocument(init?: CreateDocumentInit): ExemplaraDocument;
/**
 * Create a ComponentNode of a given type. Props are merged over the
 * registered definition's defaults by the caller (see registry.createNode).
 */
export declare function createNode(type: string, props?: Record<string, unknown>, children?: ComponentNode[]): ComponentNode;
/**
 * Deep-clone a node with fresh ids (used by clipboard, symbols, repeater).
 * Uses a JSON round-trip rather than structuredClone so it also accepts
 * reactive state proxies (such as Svelte $state) — the AST is
 * JSON-serializable by design.
 */
/** Deep-clone a page and every nested node with fresh ids. */
export declare function clonePageDeep(page: Page): Page;
export declare function cloneNodeDeep(node: ComponentNode): ComponentNode;
