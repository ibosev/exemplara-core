import { visitNodes } from '../core/tree.js';
import type {
  DataBinding,
  DataSource,
  ExemplaraDocument,
} from '../core/types.js';

export type DataValueType = 'string' | 'number' | 'boolean' | 'array' | 'object' | 'null';

export interface SampleDataPath {
  sourceId: string;
  sourceName: string;
  path: string;
  type: DataValueType;
  value: unknown;
  preview: string;
}

export interface SampleDataTreeNode extends SampleDataPath {
  id: string;
  key: string;
  children: SampleDataTreeNode[];
}

export interface DocumentBindingReference extends DataBinding {
  nodeId: string;
  nodeType: string;
  resolved: boolean;
  resolvedValue: unknown;
  preview: string;
}

export function sampleDataBySource(
  sources: readonly DataSource[],
): Record<string, Record<string, unknown>> {
  const result: Record<string, Record<string, unknown>> = {};
  for (const source of sources) {
    if (source.sampleData && typeof source.sampleData === 'object' && !Array.isArray(source.sampleData)) {
      result[source.id] = source.sampleData as Record<string, unknown>;
    }
  }
  return result;
}

export function resolveDataPath(value: unknown, path: string): unknown {
  if (!path) return value;
  let current = value;
  // AI providers and imported Handlebars templates commonly use JavaScript's
  // numeric bracket notation. Treat it as the canonical dotted array path so
  // existing templates such as `items[0].price` remain portable and safe.
  const relativePath = path.replace(/^(?:\.\.\/)+/, '');
  if (relativePath === 'this') {
    return value && typeof value === 'object' && 'item' in value
      ? (value as Record<string, unknown>).item
      : value;
  }
  const itemPath = relativePath.startsWith('this.')
    ? `item.${relativePath.slice('this.'.length)}`
    : relativePath;
  const normalizedPath = itemPath.replace(/\[(\d+)\]/g, '.$1').replace(/^\./, '');
  for (const segment of normalizedPath.split('.')) {
    if (current === null || current === undefined) return undefined;
    if (Array.isArray(current) && /^\d+$/.test(segment)) current = current[Number(segment)];
    else if (typeof current === 'object') current = (current as Record<string, unknown>)[segment];
    else return undefined;
  }
  return current;
}

function titleCaseSegment(segment: string): string {
  return segment
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
    .replace(/\bUrl\b/g, 'URL')
    .replace(/\bId\b/g, 'ID')
    .trim();
}

/** Turn `company.name` into a label a non-technical operator can read. */
export function humanizeDataPath(path: string): string {
  const parts = path.split('.').filter((part) => part !== '' && !/^\d+$/.test(part));
  if (parts.length === 0) return 'Field';
  const labeled = parts.slice(-2).map(titleCaseSegment);
  if (labeled.length === 2) {
    const [parent, child] = labeled as [string, string];
    if (!child.includes(' ')) return `${parent} ${child.toLowerCase()}`;
    return `${parent} ${child}`;
  }
  return labeled[0]!;
}

export function friendlyDataType(type: DataValueType): string {
  if (type === 'string') return 'Text';
  if (type === 'number') return 'Number';
  if (type === 'boolean') return 'Yes/no';
  if (type === 'array') return 'List';
  if (type === 'object') return 'Group';
  return 'Empty';
}

export function formatDataPreview(value: unknown, maxLength = 52): string {
  let preview: string;
  if (value === undefined) preview = 'Unresolved';
  else if (value === null) preview = 'null';
  else if (Array.isArray(value)) preview = `Array(${value.length})`;
  else if (typeof value === 'object') preview = `{ ${Object.keys(value).slice(0, 4).join(', ')}${Object.keys(value).length > 4 ? ', …' : ''} }`;
  else preview = String(value);
  return preview.length > maxLength ? `${preview.slice(0, maxLength)}…` : preview;
}

function dataType(value: unknown): DataValueType {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (typeof value === 'number') return 'number';
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'object') return 'object';
  return 'string';
}

/** Extract selectable paths from every static sample-data source. */
export function extractSampleDataPaths(
  sources: readonly DataSource[],
  maxDepth = 5,
): SampleDataPath[] {
  const paths: SampleDataPath[] = [];
  const walk = (
    source: DataSource,
    value: unknown,
    path: string,
    depth: number,
  ): void => {
    if (path) {
      paths.push({
        sourceId: source.id,
        sourceName: source.name,
        path,
        type: dataType(value),
        value,
        preview: formatDataPreview(value),
      });
    }
    if (depth >= maxDepth || value === null || value === undefined) return;
    if (Array.isArray(value)) {
      if (value.length > 0) walk(source, value[0], path ? `${path}.0` : '0', depth + 1);
      return;
    }
    if (typeof value === 'object') {
      for (const [key, child] of Object.entries(value)) {
        walk(source, child, path ? `${path}.${key}` : key, depth + 1);
      }
    }
  };

  for (const source of sources) walk(source, source.sampleData ?? {}, '', 0);
  return paths;
}

function dataTreeNode(
  source: DataSource,
  key: string,
  path: string,
  value: unknown,
  depth: number,
  maxDepth: number,
): SampleDataTreeNode {
  const children: SampleDataTreeNode[] = [];
  if (depth < maxDepth && Array.isArray(value) && value.length > 0) {
    children.push(dataTreeNode(source, '[0]', path ? `${path}.0` : '0', value[0], depth + 1, maxDepth));
  } else if (depth < maxDepth && value && typeof value === 'object') {
    for (const [childKey, childValue] of Object.entries(value)) {
      children.push(dataTreeNode(
        source,
        childKey,
        path ? `${path}.${childKey}` : childKey,
        childValue,
        depth + 1,
        maxDepth,
      ));
    }
  }
  return {
    id: `${source.id}:${path || '$root'}`,
    sourceId: source.id,
    sourceName: source.name,
    key,
    path,
    type: dataType(value),
    value,
    preview: formatDataPreview(value),
    children,
  };
}

/** Build an object/array hierarchy suitable for a reusable data-browser tree. */
export function buildSampleDataTrees(
  sources: readonly DataSource[],
  maxDepth = 6,
): SampleDataTreeNode[] {
  return sources.map((source) => dataTreeNode(
    source,
    source.name,
    '',
    source.sampleData ?? {},
    0,
    maxDepth,
  ));
}

/** Collect explicit AST DataBinding records with resolved sample-data previews. */
export function collectDocumentBindings(
  doc: ExemplaraDocument,
): DocumentBindingReference[] {
  const sources = sampleDataBySource(doc.dataSources);
  const bindings: DocumentBindingReference[] = [];
  visitNodes(doc, (node) => {
    for (const binding of node.dataBindings ?? []) {
      const resolvedValue = resolveDataPath(sources[binding.sourceId], binding.path);
      bindings.push({
        ...binding,
        nodeId: node.id,
        nodeType: node.type,
        resolved: resolvedValue !== undefined,
        resolvedValue,
        preview: formatDataPreview(resolvedValue),
      });
    }
  });
  return bindings;
}
