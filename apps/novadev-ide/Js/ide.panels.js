/* ide.panels.js */

import { state } from "./ide.state.js";
import { openFile, createFile } from "./ide.core.js";
import { saveProject } from "./ide.services.js";

export function initPanels() {
  const sidebar = document.getElementById("sidebar");
  const fileList = document.getElementById("fileList");
  const searchInput = document.getElementById("searchInput");
  const searchResults = document.getElementById("searchResults");

  /* ==============================
     Panel Controls
  ============================== */

  function showPanel(panelId) {
    document
      .querySelectorAll(".panel")
      .forEach((p) => p.classList.remove("active"));

    const panel = document.getElementById(panelId);
    if (panel) panel.classList.add("active");

    sidebar.classList.add("open");
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

  document.getElementById("openTerminal")?.addEventListener("click", () => {
    document.getElementById("terminal")?.classList.toggle("open");
  });

  document
    .getElementById("closeSidebar")
    ?.addEventListener("click", closeSidebar);

  /* ==============================
     File Explorer
  ============================== */

  function renderFileList() {
    if (!fileList) return;

    fileList.innerHTML = "";

    Object.keys(state.files).forEach((name) => {
      const li = document.createElement("li");
      li.textContent = name;

      if (name === state.currentFile) {
        li.classList.add("active");
      }

      li.addEventListener("click", () => {
        openFile(name);
        renderFileList();

        // Auto close on mobile
        if (window.innerWidth < 768) {
          closeSidebar();
        }
      });

      fileList.appendChild(li);
    });
  }

  // Create new file button (must exist in HTML)
  document.getElementById("newFileBtn")?.addEventListener("click", () => {
    const name = prompt("Enter file name (example: app.js)");

    if (!name) return;

    if (state.files[name]) {
      alert("File already exists.");
      return;
    }

    createFile(name, "");
    renderFileList();
    saveProject();
  });

  renderFileList();

  /* ==============================
   Search (Fully Working)
============================== */

  searchInput?.addEventListener("input", (e) => {
    if (e.key !== "Enter") return;

    const query = searchInput.value.trim().toLowerCase();

    searchResults.innerHTML = "";

    if (!query) return;

    Object.keys(state.files).forEach((file) => {
      const lines = state.files[file].split("\n");

      lines.forEach((line, index) => {
        if (line.toLowerCase().includes(query)) {
          const result = document.createElement("div");
          result.textContent = `${file} (Ln ${index + 1})`;
          result.classList.add("search-result");

          result.addEventListener("click", () => {
            openFile(file);

            if (state.editor) {
              state.editor.setPosition({
                lineNumber: index + 1,
                column: 1,
              });

              state.editor.revealLineInCenter(index + 1);
              state.editor.focus();
            }

            if (window.innerWidth < 768) {
              sidebar.classList.remove("open");
            }
          });

          searchResults.appendChild(result);
        }
      });
    });

    if (!searchResults.innerHTML) {
      searchResults.innerHTML = "<div>No results found</div>";
    }
  });

  /* ==============================
     Close Sidebar (Outside Click)
  ============================== */

  document.addEventListener("click", (e) => {
    if (
      sidebar.classList.contains("open") &&
      !sidebar.contains(e.target) &&
      !e.target.closest("#toggleSidebar") &&
      !e.target.closest("#openSearch") &&
      !e.target.closest("#openGit") &&
      !e.target.closest("#openSettings")
    ) {
      closeSidebar();
    }
  });

  /* ==============================
     Swipe To Close (Mobile)
  ============================== */

  let touchStartX = 0;

  sidebar.addEventListener("touchstart", (e) => {
    touchStartX = e.touches[0].clientX;
  });

  sidebar.addEventListener("touchmove", (e) => {
    const deltaX = e.touches[0].clientX - touchStartX;

    if (deltaX < -50) {
      closeSidebar();
    }
  });
}
