/* ide.core.js */
import { state } from "./ide.state.js";
import { saveProject } from "./ide.services.js";

export async function initEditor() {
  await loadMonaco();

  state.editor = monaco.editor.create(document.getElementById("editor"), {
    theme: "vs-dark",
    automaticLayout: true,
    fontSize: 14,
    minimap: { enabled: window.innerWidth > 768 },
  });

  openInitialFile();
}

/* ============================== */

function loadMonaco() {
  return new Promise((resolve, reject) => {
    require.config({
      paths: { vs: "https://unpkg.com/monaco-editor@0.44.0/min/vs" },
    });
    require(["vs/editor/editor.main"], resolve, reject);
  });
}

/* ============================== */

function openInitialFile() {
  const firstFile = Object.keys(state.files)[0];
  if (firstFile) openFile(firstFile);
}

/* ============================== */

export function openFile(name) {
  if (!(name in state.files)) return;

  // Create model if not exists
  if (!state.models[name]) {
    state.models[name] = monaco.editor.createModel(
      state.files[name],
      getLanguage(name),
    );
  }

  state.editor.setModel(state.models[name]);
  state.currentFile = name;

  if (!state.openTabs.includes(name)) {
    state.openTabs.push(name);
  }

  renderTabs();
}

/* ============================== */

export function createFile(name) {
  state.files[name] = "";

  state.models[name] = monaco.editor.createModel("", getLanguage(name));

  state.openTabs.push(name);
  state.currentFile = name;

  state.editor.setModel(state.models[name]);

  saveProject();
  renderTabs();
}

/* ============================== */

function getLanguage(name) {
  const ext = name.split(".").pop();
  const map = {
    js: "javascript",
    html: "html",
    css: "css",
    json: "json",
    md: "markdown",
  };
  return map[ext] || "plaintext";
}

/* ============================== */

export function closeTab(name) {
  const index = state.openTabs.indexOf(name);
  if (index > -1) {
    state.openTabs.splice(index, 1);
  }

  if (state.currentFile === name) {
    const next = state.openTabs[state.openTabs.length - 1];
    if (next) openFile(next);
    else state.editor.setModel(null);
  }

  renderTabs();
}

/* ============================== */

function renderTabs() {
  const tabsBar = document.getElementById("tabsBar");
  tabsBar.innerHTML = "";

  state.openTabs.forEach((name) => {
    const tab = document.createElement("div");
    tab.className = "tab";

    if (name === state.currentFile) {
      tab.classList.add("active");
    }

    tab.textContent = name;

    const close = document.createElement("span");
    close.className = "tab-close";
    close.textContent = "×";

    close.onclick = (e) => {
      e.stopPropagation();
      closeTab(name);
    };

    tab.appendChild(close);

    tab.onclick = () => openFile(name);

    tabsBar.appendChild(tab);
  });
}
