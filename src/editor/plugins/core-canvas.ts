import type { EditorPlugin } from "../composition.js";
import { isWebDocument } from "../../core/web.js";
/**
 * Registers the standard canvas decorations: the paragraph ruler above the
 * sheet surface. Optional action overlays belong to action-surfaces.
 */
export function createCoreCanvasPlugin(): EditorPlugin {
  return {
    id: "exemplara.core-canvas",
    version: "1.0.0",
    setup(api) {
      api.addCanvasDecoration({
        id: "ruler",
        placement: "above",
        order: 10,
        visible: (editor) => !editor?.doc || !isWebDocument(editor.doc),
      });
    },
  };
}
