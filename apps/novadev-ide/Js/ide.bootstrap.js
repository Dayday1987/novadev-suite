import { initEditor } from './ide.core.js';
import { initPanels } from './ide.panels.js';
import { loadProject } from './ide.services.js';

export async function bootstrapApp() {

  document.addEventListener("DOMContentLoaded", async () => {

    // 1️⃣ Load project into shared state FIRST
    loadProject();

    // 2️⃣ Initialize UI panels (they depend on state.files)
    initPanels();

    // 3️⃣ Initialize Monaco editor
    try {
      await initEditor();
    } catch (err) {
      console.error("Editor failed:", err);
    }

  });

}
