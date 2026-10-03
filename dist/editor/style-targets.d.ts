import type { ComponentNode, ExemplaraDocument, StyleBinding, StyleRule } from "../core/types.js";
export type EditorStyleRuleState = "base" | "hover" | "focus";
export interface StyleMediaOption {
    id: string;
    label: string;
    detail: string;
    mediaQuery: string | null;
}
export interface ReusableStyleRuleGroup {
    ruleId: string;
    name: string;
    selector: string;
    propertyCount: number;
    variantCount: number;
    usage: number;
}
export declare const STYLE_MEDIA_OPTIONS: readonly StyleMediaOption[];
export declare function normalizeReusableStyleName(value: string): string;
export declare function componentStyleSelector(type: string): string;
export declare function reusableStyleSelector(ruleId: string): string;
export declare function styleRuleState(state: EditorStyleRuleState): string | undefined;
export declare function findScopedStyleRule(rules: readonly StyleRule[], selector: string, state: EditorStyleRuleState, mediaQuery: string | null): StyleRule | undefined;
export declare function attachedStyleRuleIds(node: ComponentNode): string[];
export declare function setStyleRuleAttachment(bindings: readonly StyleBinding[] | undefined, ruleId: string, attached: boolean): StyleBinding[];
/** Group all base/hover/focus/media variants of one reusable class selector. */
export declare function reusableStyleRuleGroups(document: ExemplaraDocument): ReusableStyleRuleGroup[];
export declare function createReusableStyleRule(ruleId: string, name: string): StyleRule;
