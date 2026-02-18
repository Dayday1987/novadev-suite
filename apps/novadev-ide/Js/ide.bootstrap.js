import { initEditor } from './ide.core.js';
import { initPanels } from './ide.panels.js';
import { initFS } from './ide.fs.js';

export async function bootstrapApp() {

  document.addEventListener("DOMContentLoaded", async () => {

    try {
      await initFS();
    } catch (err) {
      console.error("FS init failed:", err);
      return;
    }

    initPanels();

    try {
      await initEditor();
    } catch (err) {
      console.error("Editor failed:", err);
    }

  });

}
