import { state } from "./ide.state.js";
import { openFile, createFile, applyEditorSettings, updatePreview } from "./ide.core.js";
import { listEntries } from "./ide.fs.js";
import { saveSettings } from "./ide.services.js";

export function initPanels() {

  const sidebar = document.getElementById("sidebar");
  const fileList = document.getElementById("fileList");
  const searchInput = document.getElementById("searchInput");
  const searchResults = document.getElementById("searchResults");

  /* ==============================
     Preview Toggle
  ============================== */

  document.getElementById("togglePreview")
    ?.addEventListener("click", () => {
      const preview = document.getElementById("previewPane");
      preview.classList.toggle("active");
      updatePreview();
    });

  /* ==============================
     Sidebar Controls
  ============================== */

  function showPanel(id) {
    document.querySelectorAll(".panel")
      .forEach(p => p.classList.remove("active"));

    document.getElementById(id)?.classList.add("active");
    sidebar.classList.add("open");
  }

  function closeSidebar() {
    sidebar.classList.remove("open");
  }

  document.getElementById("toggleSidebar")
    ?.addEventListener("click", () => showPanel("explorerPanel"));

  document.getElementById("closeSidebar")
    ?.addEventListener("click", closeSidebar);

  /* ==============================
     Explorer (IndexedDB)
  ============================== */

  async function renderFiles() {

    if (!state.currentProjectId) return;

    fileList.innerHTML = "";

    const entries = await listEntries(state.currentProjectId);
    const files = entries.filter(e => e.type === "file");

    files.forEach(entry => {

      const li = document.createElement("li");
      li.textContent = entry.path;

      li.onclick = () => {
        openFile(entry.path);
        if (window.innerWidth < 768) closeSidebar();
      };

      fileList.appendChild(li);
    });
  }

  document.getElementById("newFileBtn")
    ?.addEventListener("click", async () => {
      const name = prompt("File name:");
      if (!name) return;

      await createFile(name);
      renderFiles();
    });

  renderFiles();

  /* ==============================
     Search (Project-wide)
  ============================== */

  searchInput?.addEventListener("input", async () => {

    if (!state.currentProjectId) return;

    const query = searchInput.value.toLowerCase();
    searchResults.innerHTML = "";

    if (!query) return;

    const entries = await listEntries(state.currentProjectId);
    const files = entries.filter(e => e.type === "file");

    for (const file of files) {

      const content = await readFile(state.currentProjectId, file.path);
      if (!content) continue;

      const lines = content.split("\n");

      lines.forEach((line, i) => {
        if (line.toLowerCase().includes(query)) {

          const div = document.createElement("div");
          div.className = "search-result";
          div.textContent = `${file.path} (Ln ${i + 1})`;

          div.onclick = async () => {
            await openFile(file.path);
            state.editor.setPosition({ lineNumber: i + 1, column: 1 });
            state.editor.revealLineInCenter(i + 1);
            state.editor.focus();
            closeSidebar();
          };

          searchResults.appendChild(div);
        }
      });
    }
  });

  /* ==============================
     Settings
  ============================== */

  function applySettingsFromUI() {
    const settings = {
      theme: document.getElementById("themeSelect").value,
      fontSize: parseInt(document.getElementById("fontSizeInput").value) || 14,
      tabSize: parseInt(document.getElementById("tabSizeInput").value) || 2,
      wordWrap: document.getElementById("wordWrapToggle").checked,
      minimap: document.getElementById("minimapToggle").checked,
      lineNumbers: document.getElementById("lineNumbersToggle").checked,
    };

    applyEditorSettings(settings);
    saveSettings(settings);
  }

  document.getElementById("themeSelect")
    ?.addEventListener("change", applySettingsFromUI);
}
