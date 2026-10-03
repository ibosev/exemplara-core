export { render, type RenderOptions, type RenderResult } from './render.js';
export {
  renderWeb,
  renderWebTemplate,
  type WebRenderOptions,
  type WebRenderResult,
} from './web.js';
export {
  WEB_COMPONENT_DEFINITIONS,
  WEB_COMPONENT_CSS,
  registerWebRenderers,
  webLinkDefinition,
  webSectionDefinition,
} from './web-components.js';
export {
  createRendererRegistry,
  legacyRendererRegistry,
  registerRenderer,
  unregisterRenderer,
  getRenderer,
  type NodeRenderer,
  type RendererEntry,
  type RendererOptions,
  type RendererRegistration,
  type RendererRegistry,
  type RenderContext,
} from './registry.js';
export {
  resolvePath,
  interpolate,
  evaluateCondition,
  resolveNodeData,
  createBindingTransformRegistry,
  legacyBindingTransformRegistry,
  registerTransform,
  unregisterTransform,
  getTransform,
  type BindingTransform,
  type BindingTransformRegistry,
  type DataContext,
  type DataSourceMap,
} from './data.js';
export {
  createRenderRuntime,
  legacyRenderRuntime,
  type CreateRenderRuntimeOptions,
  type RenderRuntime,
} from './runtime.js';
export {
  DOCUMENT_HTML_RESET_CSS,
  renderDesignTokens,
  renderDocumentBaseStyles,
  renderFontFaces,
  renderScopedDocumentStyles,
  renderStyleRules,
} from './styles.js';
export * from './presentation.js';
export { escapeHtml, escapeAttr, styleString } from './escape.js';
export {
  sanitizePrintTemplateHtml,
  sanitizePrintTemplateCss,
  resolvePrintTemplateVariant,
  renderPrintTemplateHtml,
  renderPrintTemplateDocument,
  renderPrintTemplateSourceDocument,
  renderEditablePrintTemplateDocument,
  renderBrowserPrintTemplate,
  effectivePrintMargins,
  type PrintTemplateContext,
  type PrintTemplatePosition,
} from './print-templates.js';
