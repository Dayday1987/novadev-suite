import { state } from "./ide.state.js";
import { openFile, createFile, applyEditorSettings, updatePreview } from "./ide.core.js";
import { listEntries, readFile } from "./ide.fs.js";
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

// Explorer
document.getElementById("toggleSidebar")
  ?.addEventListener("click", () => showPanel("explorerPanel"));

// Search
document.getElementById("openSearch")
  ?.addEventListener("click", () => showPanel("searchPanel"));

// Git
document.getElementById("openGit")
  ?.addEventListener("click", () => showPanel("gitPanel"));

// Settings
document.getElementById("openSettings")
  ?.addEventListener("click", () => showPanel("settingsPanel"));

// Terminal
document.getElementById("openTerminal")
  ?.addEventListener("click", () => {
    document.getElementById("terminal")
      ?.classList.toggle("open");
  });

// Close sidebar button
document.getElementById("closeSidebar")
  ?.addEventListener("click", closeSidebar);

  /* ==============================
     Explorer Tree (Folder Support)
  ============================== */

  async function renderFiles() {

    if (!state.currentProjectId) return;

    fileList.innerHTML = "";

    const entries = await listEntries(state.currentProjectId);
    const tree = buildTree(entries);

    renderTree(tree, fileList);
  }

  function buildTree(entries) {

    const root = {};

    entries.forEach(entry => {

      const parts = entry.path.split("/");

      let current = root;

      parts.forEach((part, index) => {

        if (!current[part]) {
          current[part] = {
            __meta: index === parts.length - 1 ? entry : null,
            __children: {}
          };
        }

        current = current[part].__children;
      });
    });

    return root;
  }

  function renderTree(node, container, depth = 0) {

    Object.keys(node).forEach(name => {

      const item = node[name];
      const meta = item.__meta;
      const children = item.__children;

      const div = document.createElement("div");
      div.style.paddingLeft = (depth * 16) + "px";

      if (meta && meta.type === "file") {

        div.textContent = "📄 " + name;
        div.className = "file-item";

        div.onclick = () => {
          openFile(meta.path);
          if (window.innerWidth < 768) closeSidebar();
        };

        container.appendChild(div);

      } else {

        div.textContent = "📁 " + name;
        div.className = "folder-item";

        const childContainer = document.createElement("div");
        childContainer.style.display = "none";

        div.onclick = () => {
          childContainer.style.display =
            childContainer.style.display === "none"
              ? "block"
              : "none";
        };

        container.appendChild(div);
        container.appendChild(childContainer);

        renderTree(children, childContainer, depth + 1);
      }

    });
  }

  document.getElementById("newFileBtn")
    ?.addEventListener("click", async () => {

      const name = prompt("Enter file path (example: src/app.js)");
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

            state.editor.setPosition({
              lineNumber: i + 1,
              column: 1
            });

            state.editor.revealLineInCenter(i + 1);
            state.editor.focus();
            closeSidebar();
          };

          searchResults.appendChild(div);
        }
      });
    }

    if (!searchResults.innerHTML) {
      searchResults.innerHTML = "<div>No results found</div>";
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
