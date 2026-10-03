// ============================================
// Framework-agnostic accessibility / print-quality audit.
// Walks a document AST and reports issues. The results are UI-independent.
// ============================================
import { iterateRegions } from '../core/tree.js';
import { contrastRatio, wcagLevel } from './color.js';
import { toPlainText } from './richtext.js';
/** Run all audit rules over the document. */
export function auditDocument(doc, options = {}) {
    const issues = [];
    const pageBackground = options.pageBackground ?? '#ffffff';
    const minFontSize = options.minFontSize ?? 9;
    for (const page of doc.pages) {
        for (const [, region] of iterateRegions(page)) {
            walk(region.children, pageBackground);
        }
        function walk(nodes, background) {
            for (const node of nodes) {
                if (node.hidden)
                    continue;
                const ownBackground = typeof node.props.background === 'string' && node.props.background
                    ? node.props.background
                    : background;
                if (node.type === 'text') {
                    checkText(node, ownBackground);
                }
                if (node.type === 'image') {
                    checkImage(node);
                }
                if (node.children)
                    walk(node.children, ownBackground);
                for (const slotChildren of Object.values(node.slots ?? {})) {
                    walk(slotChildren, ownBackground);
                }
            }
        }
        function checkText(node, background) {
            const color = typeof node.props.color === 'string' && node.props.color ? node.props.color : '#1f2937';
            const fontSize = Number(node.props.fontSize) || 12;
            const content = typeof node.props.content === 'string' ? toPlainText(node.props.content) : '';
            const ratio = contrastRatio(color, background);
            if (ratio !== null) {
                const large = fontSize >= 18 || (fontSize >= 14 && String(node.props.fontWeight) === '700');
                const level = wcagLevel(ratio, large);
                if (level === 'fail') {
                    issues.push({
                        severity: 'error',
                        rule: 'contrast',
                        message: `Text contrast ${ratio.toFixed(2)}:1 fails WCAG AA against ${background}`,
                        nodeId: node.id,
                        pageId: page.id,
                    });
                }
                else if (level === 'AA-large' && !large) {
                    issues.push({
                        severity: 'warning',
                        rule: 'contrast',
                        message: `Text contrast ${ratio.toFixed(2)}:1 only passes for large text`,
                        nodeId: node.id,
                        pageId: page.id,
                    });
                }
            }
            if (fontSize < minFontSize) {
                issues.push({
                    severity: 'warning',
                    rule: 'font-size',
                    message: `Font size ${fontSize}px is below the ${minFontSize}px print minimum`,
                    nodeId: node.id,
                    pageId: page.id,
                });
            }
            if (!content) {
                issues.push({
                    severity: 'warning',
                    rule: 'empty-text',
                    message: 'Text component has no content',
                    nodeId: node.id,
                    pageId: page.id,
                });
            }
        }
        function checkImage(node) {
            if (!node.props.src) {
                issues.push({
                    severity: 'error',
                    rule: 'image-src',
                    message: 'Image has no source',
                    nodeId: node.id,
                    pageId: page.id,
                });
            }
            if (!node.props.alt) {
                issues.push({
                    severity: 'warning',
                    rule: 'image-alt',
                    message: 'Image is missing alt text',
                    nodeId: node.id,
                    pageId: page.id,
                });
            }
        }
    }
    return issues;
}
