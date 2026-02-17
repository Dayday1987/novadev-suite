import { initEditor } from './ide.core.js';
import { initPanels } from './ide.panels.js';
import { loadProject } from './ide.services.js';

export async function bootstrapApp() {

  document.addEventListener("DOMContentLoaded", async () => {

    initPanels();   // Always initialize UI first

    try {
      await initEditor();
    } catch (err) {
      console.error("Editor failed:", err);
    }

  });

}
