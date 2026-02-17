import { initEditor } from './ide.core.js';
import { initPanels } from './ide.panels.js';
import { loadProject } from './ide.services.js';

export async function bootstrapApp() {

  document.addEventListener("DOMContentLoaded", async () => {

    loadProject();
    initPanels();

    try {
      await initEditor();
    } catch (err) {
      console.error("Monaco failed to load:", err);
      alert("Editor failed to load.");
    }

  });

}
