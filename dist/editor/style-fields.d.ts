import type { ComponentNode } from "../core/types.js";
import type { EditorSession } from "./session.js";
export type EditorStyleSector = "layout" | "spacing" | "size" | "typography" | "decorations";
export type EditorStyleFieldKind = "text" | "color" | "select";
/** One reusable selected-element CSS control contributed by a plugin. */
export interface EditorStyleField {
    id: string;
    label: string;
    property: string;
    sector: EditorStyleSector;
    kind: EditorStyleFieldKind;
    order?: number;
    placeholder?: string;
    options?: readonly string[];
    visible?: (editor: EditorSession, node: ComponentNode) => boolean;
}
export declare const STYLE_SECTOR_LABELS: Readonly<Record<EditorStyleSector, string>>;
export declare const STYLE_SECTOR_ORDER: readonly EditorStyleSector[];
/**
 * CSS field catalog for the visual editor.
 * Hosts can add more fields through `api.addStyleField()`.
 */
export declare const DEFAULT_ELEMENT_STYLE_FIELDS: readonly EditorStyleField[];
