/* ide.panels.js */
import { state } from "./ide.state.js";
import { openFile, createFile, applyEditorSettings } from "./ide.core.js";
import { saveProject, saveSettings } from "./ide.services.js";

export function initPanels() {
  const sidebar = document.getElementById("sidebar");
  const fileList = document.getElementById("fileList");
  const searchInput = document.getElementById("searchInput");
  const searchResults = document.getElementById("searchResults");

  /* ==============================
     Sidebar Controls
  ============================== */

  function showPanel(id) {
    document
      .querySelectorAll(".panel")
      .forEach((p) => p.classList.remove("active"));

    document.getElementById(id)?.classList.add("active");
    sidebar.classList.add("open");

    if (id === "searchPanel") {
      setTimeout(() => searchInput?.focus(), 150);
    }
  }

  function closeSidebar() {
    sidebar.classList.remove("open");
  }

  document
    .getElementById("toggleSidebar")
    ?.addEventListener("click", () => showPanel("explorerPanel"));

  document
    .getElementById("openSearch")
    ?.addEventListener("click", () => showPanel("searchPanel"));

  document
    .getElementById("openGit")
    ?.addEventListener("click", () => showPanel("gitPanel"));

  document
    .getElementById("openSettings")
    ?.addEventListener("click", () => showPanel("settingsPanel"));

  document
    .getElementById("openTerminal")
    ?.addEventListener("click", () =>
      document.getElementById("terminal")?.classList.toggle("open"),
    );

  document
    .getElementById("closeSidebar")
    ?.addEventListener("click", closeSidebar);

  /* ==============================
     File Explorer
  ============================== */

  function renderFiles() {
    fileList.innerHTML = "";

    Object.keys(state.files).forEach((name) => {
      const li = document.createElement("li");
      li.textContent = name;

      if (name === state.currentFile) li.classList.add("active");

      li.onclick = () => {
        openFile(name);
        renderFiles();
        if (window.innerWidth < 768) closeSidebar();
      };

      fileList.appendChild(li);
    });
  }

  document.getElementById("newFileBtn")?.addEventListener("click", () => {
    const name = prompt("File name:");
    if (!name) return;
    createFile(name);
    renderFiles();
  });

  renderFiles();

  /* ==============================
     Search (Mobile Optimized)
  ============================== */

  searchInput?.addEventListener("input", () => {
    const query = searchInput.value.toLowerCase();
    searchResults.innerHTML = "";

    if (!query) return;

    Object.keys(state.files).forEach((file) => {
      const lines = state.files[file].split("\n");

      lines.forEach((line, i) => {
        if (line.toLowerCase().includes(query)) {
          const div = document.createElement("div");
          div.className = "search-result";
          div.textContent = `${file} (Ln ${i + 1})`;

          div.onclick = () => {
            openFile(file);
            state.editor.setPosition({ lineNumber: i + 1, column: 1 });
            state.editor.revealLineInCenter(i + 1);
            state.editor.focus();
            if (window.innerWidth < 768) closeSidebar();
          };

          searchResults.appendChild(div);
        }
      });
    });
  });

  /* ==============================
     Settings Panel
  ============================== */

  document
    .getElementById("themeSelect")
    ?.addEventListener("change", applySettingsFromUI);

  document
    .getElementById("fontSizeInput")
    ?.addEventListener("input", applySettingsFromUI);

  document
    .getElementById("tabSizeInput")
    ?.addEventListener("input", applySettingsFromUI);

  document
    .getElementById("wordWrapToggle")
    ?.addEventListener("change", applySettingsFromUI);

  document
    .getElementById("minimapToggle")
    ?.addEventListener("change", applySettingsFromUI);

  document
    .getElementById("lineNumbersToggle")
    ?.addEventListener("change", applySettingsFromUI);

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
}
