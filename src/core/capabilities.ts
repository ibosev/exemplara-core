import type { ComponentNode, ExemplaraDocument, PrintTemplateVariants } from './types.js';
import { iterateRegions } from './tree.js';

/**
 * Stable semantic capabilities understood by the editor, renderer, and hosts.
 * Product plans resolve to these ids; the package never models subscriptions.
 */
export const CAPABILITY_IDS = [
  'document.edit',
  'document.history',
  'document.clipboard',
  'component.basic',
  'outline.layers',
  'node.context-menu',
  'text.rich',
  'preview',
  'data.sources.manage',
  'data.bind.author',
  'data.resolve',
  'design.edit',
  'print.layout',
  'print.header-footer',
  'print.pagination',
  'assets.manage',
  'assets.resolve',
  'symbols.manage',
  'symbols.resolve',
  'audit.view',
  'import.document.json',
  'import.html-css',
  'export.document.json',
  'export.pdf',
] as const;

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

export interface UnsupportedDocumentCapability extends DocumentCapabilityRequirement {}

export function createCapabilityPolicy(
  enabled: Iterable<CapabilityId>,
  options: CapabilityPolicyOptions = {},
): CapabilityPolicy {
  const values = [...new Set(enabled)];
  const allowed = new Set(values);
  return Object.freeze({
    enabled: Object.freeze(values),
    unsupportedDocument: options.unsupportedDocument ?? 'reject',
    allows: (capability: CapabilityId) => allowed.has(capability),
  });
}

export function createAllowAllCapabilityPolicy(
  options: CapabilityPolicyOptions = {},
): CapabilityPolicy {
  return Object.freeze({
    enabled: '*',
    unsupportedDocument: options.unsupportedDocument ?? 'reject',
    allows: () => true,
  });
}

function hasTemplateExpression(value: string): boolean {
  return /\{\{[\s\S]+?\}\}/.test(value);
}

/** Native print tokens remain available without the optional data-binding feature. */
function printTemplateUsesExternalData(value: string): boolean {
  const expressions = value.matchAll(/\{\{\s*([\s\S]+?)\s*\}\}/g);
  for (const match of expressions) {
    const expression = match[1]?.trim() ?? '';
    const primaryExpression = expression.split('|')[0]?.trim() ?? '';
    const referencedPaths = primaryExpression.match(/[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*/g) ?? [];
    // Helper syntax places the value path last: `uppercase document.title`.
    const valuePath = referencedPaths.at(-1);
    const root = valuePath?.split('.')[0];
    if (root && root !== 'page' && root !== 'document' && root !== 'date') return true;
  }
  return false;
}

function walkPropExpressions(
  value: unknown,
  path: string,
  visit: (path: string) => void,
  seen: Set<object>,
): void {
  if (typeof value === 'string') {
    if (hasTemplateExpression(value)) visit(path);
    return;
  }
  if (!value || typeof value !== 'object' || seen.has(value)) return;
  seen.add(value);
  if (Array.isArray(value)) {
    value.forEach((entry, index) => walkPropExpressions(entry, `${path}[${index}]`, visit, seen));
    return;
  }
  for (const [key, entry] of Object.entries(value)) {
    walkPropExpressions(entry, `${path}.${key}`, visit, seen);
  }
}

function analyzeNode(
  node: ComponentNode,
  path: string,
  add: (requirement: DocumentCapabilityRequirement) => void,
): void {
  if (node.dataBindings?.length) {
    add({
      capability: 'data.resolve',
      path: `${path}.dataBindings`,
      nodeId: node.id,
      reason: 'Component has explicit data bindings.',
    });
  }
  if (node.conditions?.length || node.type === 'conditional' || node.type === 'repeater') {
    add({
      capability: 'data.resolve',
      path,
      nodeId: node.id,
      reason: 'Component uses conditional or repeated data behavior.',
    });
  }
  walkPropExpressions(node.props, `${path}.props`, (expressionPath) => {
    add({
      capability: 'data.resolve',
      path: expressionPath,
      nodeId: node.id,
      reason: 'Component property contains a template expression.',
    });
  }, new Set());
  if (node.symbolId) {
    add({
      capability: 'symbols.resolve',
      path: `${path}.symbolId`,
      nodeId: node.id,
      reason: 'Component is linked to a reusable symbol.',
    });
  }
  node.children?.forEach((child, index) => analyzeNode(child, `${path}.children[${index}]`, add));
  for (const [slot, children] of Object.entries(node.slots ?? {})) {
    children.forEach((child, index) => analyzeNode(child, `${path}.slots.${slot}[${index}]`, add));
  }
}

function analyzePrintVariants(
  variants: PrintTemplateVariants,
  path: string,
  add: (requirement: DocumentCapabilityRequirement) => void,
): void {
  for (const [variant, html] of Object.entries(variants)) {
    if (!printTemplateUsesExternalData(html)) continue;
    add({
      capability: 'data.resolve',
      path: `${path}.${variant}`,
      reason: 'Print template contains a non-native data expression.',
    });
  }
}

export function analyzeDocumentCapabilities(
  document: ExemplaraDocument,
): DocumentCapabilityAnalysis {
  const requirements: DocumentCapabilityRequirement[] = [];
  const seen = new Set<string>();
  const add = (requirement: DocumentCapabilityRequirement): void => {
    const key = `${requirement.capability}:${requirement.path}:${requirement.nodeId ?? ''}`;
    if (seen.has(key)) return;
    seen.add(key);
    requirements.push(requirement);
  };

  if (document.print.enabled || document.print.header.enabled || document.print.footer.enabled) {
    add({
      capability: 'print.header-footer',
      path: 'print',
      reason: 'Document uses browser print headers or footers.',
    });
  }
  if (document.pagination.mode === 'auto') {
    add({
      capability: 'print.pagination',
      path: 'pagination.mode',
      reason: 'Document uses automatic multi-page flow.',
    });
  }
  analyzePrintVariants(document.print.header.variants, 'print.header.variants', add);
  analyzePrintVariants(document.print.footer.variants, 'print.footer.variants', add);
  document.print.sections.forEach((section, index) => {
    if (section.header.variants) {
      analyzePrintVariants(section.header.variants, `print.sections[${index}].header.variants`, add);
    }
    if (section.footer.variants) {
      analyzePrintVariants(section.footer.variants, `print.sections[${index}].footer.variants`, add);
    }
  });

  document.pages.forEach((page, pageIndex) => {
    for (const [regionName, region] of iterateRegions(page)) {
      region.children.forEach((node, nodeIndex) => {
        analyzeNode(node, `pages[${pageIndex}].regions.${regionName}.children[${nodeIndex}]`, add);
      });
    }
  });
  document.symbols.forEach((symbol, index) => {
    analyzeNode(symbol.definition, `symbols[${index}].definition`, add);
  });

  return {
    requiredCapabilities: [...new Set(requirements.map((entry) => entry.capability))],
    requirements,
  };
}

export function findUnsupportedDocumentCapabilities(
  document: ExemplaraDocument,
  policy: CapabilityPolicy,
): UnsupportedDocumentCapability[] {
  return analyzeDocumentCapabilities(document).requirements.filter(
    (requirement) => !policy.allows(requirement.capability),
  );
}

export class UnsupportedDocumentCapabilitiesError extends Error {
  constructor(readonly diagnostics: readonly UnsupportedDocumentCapability[]) {
    const capabilities = [...new Set(diagnostics.map((entry) => entry.capability))].join(', ');
    super(`Document requires disabled capabilities: ${capabilities}`);
    this.name = 'UnsupportedDocumentCapabilitiesError';
  }
}

export function assertDocumentCapabilities(
  document: ExemplaraDocument,
  policy: CapabilityPolicy,
): void {
  const diagnostics = findUnsupportedDocumentCapabilities(document, policy);
  if (diagnostics.length) throw new UnsupportedDocumentCapabilitiesError(diagnostics);
}
