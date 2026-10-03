export const DOCUMENT_VERSION_SERVICE_ID = "exemplara.document-versions";
export function documentVersionSourceLabel(source) {
    switch (source) {
        case "manual":
            return "Manual save";
        case "autosave":
            return "Autosave";
        case "ai_apply":
            return "AI change";
        case "restore":
            return "Restore point";
        case "publish":
            return "Published";
        default:
            return "Snapshot";
    }
}
export function documentVersionLabel(entry) {
    if (entry.label)
        return entry.label;
    if (entry.kind === "published")
        return `Published version ${entry.version ?? ""}`.trim();
    return `Snapshot ${entry.version ?? ""}`.trim();
}
export function isDocumentVersionService(value) {
    if (!value || typeof value !== "object")
        return false;
    const service = value;
    return (typeof service.list === "function" &&
        typeof service.getDocument === "function" &&
        typeof service.saveDraft === "function" &&
        typeof service.createSnapshot === "function" &&
        typeof service.restore === "function");
}
