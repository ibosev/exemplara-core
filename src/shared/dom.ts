// ============================================
// Framework-agnostic DOM helpers.
// Plain functions over standard DOM APIs. Guarded so importing from
// Node is safe.
// ============================================

/** Trigger a client-side file download. */
export function downloadFile(filename: string, content: string | Blob, mime = 'text/plain'): void {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/** Read a File (e.g. from an <input type="file">) as a data: URL. */
export function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/** Measure the natural dimensions of an image source. */
export function getImageSize(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = src;
  });
}

/** True when the event target is a text-editing element (inputs, contenteditable). */
export function isEditableTarget(target: EventTarget | null): boolean {
  if (typeof HTMLElement === 'undefined' || !(target instanceof HTMLElement)) return false;
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    target.isContentEditable
  );
}

/** Walk up from an element to find a `data-node-id` (canvas hit-testing). */
export function closestNodeId(element: Element | null): string | null {
  const host = element?.closest('[data-node-id]');
  return host?.getAttribute('data-node-id') ?? null;
}

/**
 * Keep a floating element (context menu, popover) inside the viewport.
 * Returns adjusted coordinates for a box of the given size at (x, y).
 */
export function clampToViewport(
  x: number,
  y: number,
  width: number,
  height: number,
  margin = 8,
): { x: number; y: number } {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  return {
    x: Math.max(margin, Math.min(x, vw - width - margin)),
    y: Math.max(margin, Math.min(y, vh - height - margin)),
  };
}
