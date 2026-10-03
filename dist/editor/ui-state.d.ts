import { type ReadableAtom } from 'nanostores';
import type { EditorSession } from './session.js';
import type { PrintTemplateVariant, TabStopAlignment } from '../core/types.js';
import type { BindingAutocompleteTrigger } from '../shared/binding-authoring.js';
import type { FloatingControlsPlacement } from '../shared/floating-controls.js';
import type { SheetOverflow } from '../shared/preview.js';
import type { EditorStyleRuleState } from './style-targets.js';
import type { DocumentVersionEntry } from './version-history.js';
export interface PrintDraftTarget {
    position: 'header' | 'footer';
    pageIndex: number;
    variant: PrintTemplateVariant;
}
export type SampleValueType = 'string' | 'number' | 'boolean' | 'object' | 'array' | 'null';
export type StyleTargetKey = 'inline' | 'component' | `class:${string}`;
export declare const SIDEBAR_DEFAULT_WIDTHS: {
    readonly left: 286;
    readonly right: 344;
};
export declare const SIDEBAR_MIN_WIDTHS: {
    readonly left: 240;
    readonly right: 280;
};
export declare const SIDEBAR_MAX_WIDTH = 840;
export declare const MIN_CANVAS_WIDTH = 360;
/** Actual component and feature state, shared by every view of one session. */
declare function defaults(editor: EditorSession, scope: string, profile: string): {
    ruler: {
        tabAlignment: TabStopAlignment;
        draftLeft: number;
        draftFirst: number;
        draftRight: number;
        dragging: boolean;
    };
    layers: {
        expansion: Record<string, boolean>;
    };
    property: {
        jsonError: string;
    };
    tableRows: {
        modeOverride: "connected" | "manual" | null;
    };
    richText: {
        draftHtml: string;
        autocomplete: {
            trigger: BindingAutocompleteTrigger;
            left: number;
            top: number;
        } | null;
        highlightedIndex: number;
        preferredSourceId: string | undefined;
    };
    printChrome: {
        draftHtml: string;
        committed: boolean;
    };
    selectionToolbar: {
        placement: FloatingControlsPlacement;
        fullWidth: number;
        measuredSignature: string;
    };
    shell: {
        sidebarWidths: Record<"left" | "right", number>;
        resizingSide: "left" | "right" | null;
        resizeStartX: number;
        resizeStartWidth: number;
    };
    canvas: {
        reflowPending: boolean;
        scrollSyncPending: boolean;
        lastPrintFocus: number;
    };
    preview: {
        withData: boolean;
        sheetMode: boolean;
        showGuides: boolean;
        overflows: SheetOverflow[];
    };
    assets: {
        uploading: boolean;
        pendingImports: number;
        error: string;
    };
    expressions: {
        showRaw: boolean;
    };
    design: {
        newColorName: string;
    };
    utils: {
        query: string;
        copied: string | null;
    };
    blocks: {
        query: string;
        view: "all" | "catalog" | "saved";
        editingSymbolId: string | null;
        editingLabel: string;
        deletingSymbolId: string | null;
    };
    data: {
        importError: string;
        expandedSourceId: string | null;
        dialogWasOpen: boolean;
        dragging: boolean;
        pasteOpen: boolean;
        pasteText: string;
        view: "fields" | "used" | "structure";
        query: string;
    };
    library: {
        query: string;
        source: "all" | "user" | "system";
    };
    printSourceDraft: {
        position: "header" | "footer";
        pageIndex: number;
        variant: PrintTemplateVariant;
        sourceTab: "html" | "css";
        htmlDrafts: Record<string, string>;
        originalHtml: Record<string, string>;
        draftTargets: Record<string, PrintDraftTarget>;
        cssDraft: string;
        originalCss: string;
        status: string;
    };
    dataStructure: {
        expandedOverride: boolean | null;
        adding: boolean;
        draftName: string;
        draftType: SampleValueType;
        localError: string;
    };
    dataTree: {
        expandedOverride: boolean | null;
    };
    elementStyle: {
        targetKey: StyleTargetKey;
        ruleState: EditorStyleRuleState;
        mediaScope: string;
        customMediaQuery: string;
        newClassName: string;
        previousNodeId: string | null;
    };
    printSource: {
        open: boolean;
    };
    disclosures: {
        expanded: Record<string, boolean>;
    };
    versions: {
        entries: readonly DocumentVersionEntry[];
        loading: boolean;
        previewLoadingId: string | null;
        snapshotLoading: boolean;
        restoring: boolean;
        error: string;
    };
    versionPersistence: {
        disposed: boolean;
        saving: boolean;
        epoch: number;
        listRequest: number;
        previewRequest: number;
        lastSaved: string;
    };
};
export type EditorUiProfiles = ReturnType<typeof defaults>;
export type EditorUiProfile = keyof EditorUiProfiles;
export interface AssetImportInput {
    name: string;
    type: string;
    read(): Promise<{
        src: string;
        width?: number;
        height?: number;
    }>;
}
/** Nano Store with typed immutable writes and document/lifetime fencing. */
export declare class EditorUiModel<T extends object> {
    #private;
    readonly editor: EditorSession;
    readonly initial: () => T;
    readonly store: ReadableAtom<T>;
    readonly values: T;
    constructor(editor: EditorSession, initial: () => T);
    set<K extends keyof T>(key: K, value: T[K]): void;
    patch(change: Partial<T>): void;
    update(update: (value: T) => T): void;
    reset(): void;
    /** Capture before awaiting a platform/service operation. */
    capture(): () => boolean;
    begin(channel: string): () => boolean;
}
export declare class EditorUiState {
    #private;
    readonly editor: EditorSession;
    constructor(editor: EditorSession);
    get<K extends EditorUiProfile>(profile: K, scope?: string, initial?: Partial<EditorUiProfiles[K]>): EditorUiModel<EditorUiProfiles[K]>;
    reset(): void;
    detachView(): void;
    commitRichText(nodeId: string): void;
    cancelRichText(nodeId: string): void;
    importAssets(files: readonly AssetImportInput[]): Promise<void>;
    importData(raw: string, label: string): boolean;
    readData(label: string, read: () => Promise<string>): Promise<boolean>;
    copyExample(name: string, copy: () => Promise<void>): Promise<void>;
    destroy(): void;
}
export {};
