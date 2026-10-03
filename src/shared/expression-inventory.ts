import { visitNodes } from '../core/tree.js';
import type { ExemplaraDocument } from '../core/types.js';
import { sampleDataBySource, formatDataPreview } from './data-browser.js';
import { mergeSampleData } from './editor.js';
import {
  evaluateTemplateExpression,
  type TemplateExpressionRuntime,
} from './expression.js';

export interface TemplateExpressionReference {
  id: string;
  kind: 'inline' | 'binding' | 'print';
  nodeId?: string;
  nodeType?: string;
  target: string;
  raw: string;
  expression: string;
  resolved: boolean;
  resolvedValue: unknown;
  preview: string;
}

function expressionsIn(value: string): Array<{ raw: string; expression: string }> {
  return [...value.matchAll(/\{\{\s*([^}]+?)\s*\}\}/g)].map((match) => ({
    raw: match[0],
    expression: match[1]!.trim(),
  }));
}

function scanValue(
  value: unknown,
  target: string,
  visit: (target: string, raw: string, expression: string) => void,
): void {
  if (typeof value === 'string') {
    for (const entry of expressionsIn(value)) visit(target, entry.raw, entry.expression);
  } else if (Array.isArray(value)) {
    value.forEach((child, index) => scanValue(child, `${target}.${index}`, visit));
  } else if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) scanValue(child, `${target}.${key}`, visit);
  }
}

/** Inventory inline, explicit-binding, and print-chrome expressions with live previews. */
export function collectTemplateExpressions(
  doc: ExemplaraDocument,
  runtime?: TemplateExpressionRuntime,
): TemplateExpressionReference[] {
  const context = {
    ...mergeSampleData(doc.dataSources),
    document: { title: doc.name },
    page: {
      number: 1,
      total: doc.pages.length,
      label: doc.pages[0]?.label ?? '',
    },
    date: doc.meta.updatedAt.slice(0, 10),
  };
  const sources = sampleDataBySource(doc.dataSources);
  const references: TemplateExpressionReference[] = [];
  const add = (entry: Omit<TemplateExpressionReference, 'id' | 'resolved' | 'preview'>): void => {
    references.push({
      ...entry,
      id: `${entry.kind}:${entry.nodeId ?? 'document'}:${entry.target}:${references.length}`,
      resolved: entry.resolvedValue !== undefined,
      preview: formatDataPreview(entry.resolvedValue, 72),
    });
  };

  visitNodes(doc, (node) => {
    for (const [prop, value] of Object.entries(node.props)) {
      scanValue(value, prop, (target, raw, expression) => add({
        kind: 'inline',
        nodeId: node.id,
        nodeType: node.type,
        target,
        raw,
        expression,
        resolvedValue: evaluateTemplateExpression(expression, context, runtime),
      }));
    }
    for (const binding of node.dataBindings ?? []) {
      const bindingContext = { ...context, ...(sources[binding.sourceId] ?? {}) };
      const resolvedValue = evaluateTemplateExpression(
        binding.transform ? `${binding.path} | ${binding.transform}` : binding.path,
        bindingContext,
        runtime,
      );
      add({
        kind: 'binding',
        nodeId: node.id,
        nodeType: node.type,
        target: binding.targetProp,
        raw: `{{${binding.path}}}`,
        expression: binding.transform
          ? `${binding.path} | ${binding.transform}`
          : binding.path,
        resolvedValue,
      });
    }
  });

  for (const position of ['header', 'footer'] as const) {
    for (const [variant, html] of Object.entries(doc.print[position].variants)) {
      scanValue(html, `print.${position}.${variant}`, (target, raw, expression) => add({
        kind: 'print',
        target,
        raw,
        expression,
        resolvedValue: evaluateTemplateExpression(expression, context, runtime),
      }));
    }
  }
  return references;
}
