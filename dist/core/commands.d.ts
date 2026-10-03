import type { Asset, ComponentNode, DataSource, ExemplaraDocument, Page, PrintSettings, StyleRule, SymbolDefinition } from './types.js';
export type Command = {
    type: 'document:update';
    payload: {
        changes: Partial<Pick<ExemplaraDocument, 'name' | 'meta'>>;
    };
} | {
    type: 'component:add';
    payload: {
        parentId: string;
        slot?: string;
        index?: number;
        node: ComponentNode;
    };
} | {
    type: 'component:remove';
    payload: {
        nodeId: string;
    };
} | {
    type: 'component:move';
    payload: {
        nodeId: string;
        targetParentId: string;
        targetSlot?: string;
        targetIndex: number;
    };
} | {
    type: 'component:update';
    payload: {
        nodeId: string;
        changes: Partial<ComponentNode>;
    };
} | {
    type: 'component:duplicate';
    payload: {
        nodeId: string;
    };
} | {
    type: 'page:add';
    payload: {
        page: Page;
        index?: number;
    };
} | {
    type: 'page:remove';
    payload: {
        pageId: string;
    };
} | {
    type: 'page:reorder';
    payload: {
        pageId: string;
        newIndex: number;
    };
} | {
    type: 'page:update';
    payload: {
        pageId: string;
        changes: Partial<Page>;
    };
} | {
    type: 'print:update';
    payload: {
        changes: Partial<PrintSettings>;
    };
} | {
    type: 'pagination:update';
    payload: {
        changes: Partial<ExemplaraDocument['pagination']>;
    };
} | {
    type: 'style:add-rule';
    payload: {
        rule: StyleRule;
    };
} | {
    type: 'style:update-rule';
    payload: {
        ruleId: string;
        changes: Partial<StyleRule>;
    };
} | {
    type: 'style:remove-rule';
    payload: {
        ruleId: string;
    };
} | {
    type: 'style:update-tokens';
    payload: {
        path: string;
        value: unknown;
    };
} | {
    type: 'data:add-source';
    payload: {
        source: DataSource;
    };
} | {
    type: 'data:update-source';
    payload: {
        sourceId: string;
        changes: Partial<DataSource>;
    };
} | {
    type: 'data:remove-source';
    payload: {
        sourceId: string;
    };
} | {
    type: 'asset:add';
    payload: {
        asset: Asset;
    };
} | {
    type: 'asset:remove';
    payload: {
        assetId: string;
    };
} | {
    type: 'symbol:create';
    payload: {
        symbol: SymbolDefinition;
    };
} | {
    type: 'symbol:rename';
    payload: {
        symbolId: string;
        label: string;
    };
} | {
    type: 'symbol:remove';
    payload: {
        symbolId: string;
    };
} | {
    type: 'symbol:detach';
    payload: {
        nodeId: string;
    };
};
export declare class CommandError extends Error {
    readonly command: Command;
    constructor(message: string, command: Command);
}
/**
 * Apply a command by mutating `doc`. Throws CommandError on invalid input
 * (unknown ids, cyclic moves) without any partial mutation.
 */
export declare function applyCommand(doc: ExemplaraDocument, cmd: Command): void;
