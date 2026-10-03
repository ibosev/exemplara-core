/** Write a design-token value back onto a matching CSS custom property. */
export declare function applyCssCustomProperty(css: string, property: string, value: string): string;
/** Replace every custom property whose name matches `namePattern`. */
export declare function applyCssCustomPropertiesMatching(css: string, namePattern: RegExp, value: string): string;
/** Inline custom properties freeze imported template colors above the Design panel. */
export declare function stripCssCustomProperties(style: string): string;
export declare function cssCustomPropertyDeclarations(colors: Record<string, string>): string;
export declare function themePrefixFromPageToken(name: string): string | null;
/** Point leftover baked greys/golds at the template's design tokens. */
export declare function harmonizeThemeColorValue(value: string, prefix: string): string;
export declare function harmonizeTemplateThemeCss(css: string, prefix: string): string;
export declare function derivedSurfaceToken(prefix: string): string;
export declare function derivedPanelToken(prefix: string): string;
export declare function isPageBackgroundTokenName(name: string): boolean;
export declare function isDarkColorSample(value: string): boolean;
/**
 * Older forks baked `color-mix(var(--mujo-bg), black)` into hex stops, so the
 * Design panel's page token no longer paints the template. Re-attach those
 * root backgrounds to the live token.
 */
export declare function retieBakedRootBackgrounds(css: string, cssVar: string, tokenVar: string, sample: string): string;
/** Keep imported template CSS (`--mujo-bg`, `--quay-page`, …) in sync with the Design panel. */
export declare function syncWebCustomCssFromToken(customCss: string, path: string, value: unknown): string;
