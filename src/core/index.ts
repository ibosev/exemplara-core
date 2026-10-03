export * from './types.js';
export {
  CAPABILITY_IDS,
  analyzeDocumentCapabilities,
  assertDocumentCapabilities,
  createAllowAllCapabilityPolicy,
  createCapabilityPolicy,
  findUnsupportedDocumentCapabilities,
  UnsupportedDocumentCapabilitiesError,
  type CapabilityId,
  type CapabilityPolicy,
  type CapabilityPolicyOptions,
  type DocumentCapabilityAnalysis,
  type DocumentCapabilityRequirement,
  type UnsupportedDocumentBehavior,
  type UnsupportedDocumentCapability,
} from './capabilities.js';
export { createId } from './id.js';
export { PAGE_PRESETS, DEFAULT_MARGINS, getPageDimensions } from './presets.js';
export {
  createDocument,
  createPage,
  createRegion,
  createNode,
  cloneNodeDeep,
  clonePageDeep,
  createDefaultTokens,
  createStyleSheet,
  createPrintSettings,
  createPrintSection,
  createPaginationSettings,
  type CreateDocumentInit,
  type CreatePageInit,
} from './create.js';
export {
  visitNodes,
  findNode,
  locateNode,
  isDirectBodyNode,
  resolveContainer,
  isSelfOrDescendant,
  collectNodeIds,
  iterateRegions,
  iterateWebChrome,
  type NodeLocation,
} from './tree.js';
export { applyCommand, CommandError, type Command } from './commands.js';
export {
  applyCssCustomProperty,
  applyCssCustomPropertiesMatching,
  cssCustomPropertyDeclarations,
  derivedPanelToken,
  derivedSurfaceToken,
  harmonizeTemplateThemeCss,
  harmonizeThemeColorValue,
  isDarkColorSample,
  isPageBackgroundTokenName,
  retieBakedRootBackgrounds,
  stripCssCustomProperties,
  syncWebCustomCssFromToken,
  themePrefixFromPageToken,
} from './custom-css-tokens.js';
export {
  ComponentRegistry,
  defaultRegistry,
  type ComponentRegistryListener,
} from './registry.js';
export {
  DocumentEngine,
  type DocumentEngineOptions,
  type DocumentEngineState,
  type DocumentEngineListener,
} from './engine.js';
export {
  serialize,
  deserialize,
  validateDocument,
  DeserializationError,
  type DeserializeOptions,
  type ValidationIssue,
  type ValidationResult,
} from './serialization.js';
export { migrateDocument, registerMigration, MigrationError, type Migration } from './migrate.js';
export {
  DEFAULT_WEB_DOCUMENT_SETTINGS,
  DEFAULT_WEB_PAGE_SETTINGS,
  createWebDocument,
  createWebPage,
  isWebDocument,
  normalizeWebSlug,
  resolveWebRouteHref,
  uniqueWebSlug,
  usesImportedSiteChrome,
  webPageLabelFromSlug,
  type CreateWebDocumentInit,
} from './web.js';
export {
  flowFragmentCount,
  planCollapseFlowGroup,
  planPageFlow,
  type CollapseFlowGroupPlan,
  type PageFlowMeasurement,
  type PageFlowNodeMeasurement,
  type PageFlowPlan,
  type PageFlowContainerSplitMeasurement,
  type PageFlowLeafSplitMeasurement,
  type PageFlowSplitMeasurement,
  type PageFlowTableSplitMeasurement,
  type PageFlowTextSplitMeasurement,
} from './pagination.js';
export {
  PRINT_PRESETS,
  createPrintPreset,
  type PrintPresetId,
  type PrintPresetDefinition,
} from './print-presets.js';
export {
  materializeSectionVariants,
  resolvePrintSection,
  resolveSectionTemplate,
  type ResolvedPrintSection,
  type ResolvedSectionTemplate,
  type SectionTemplatePosition,
} from './print-sections.js';
export {
  planRemovePrintSectionBreak,
  planSetPrintSectionLinked,
  planStartPrintSection,
  planUpdatePrintSection,
  planUpdatePrintVariant,
  type PrintSectionCommandPlan,
} from './print-section-commands.js';
