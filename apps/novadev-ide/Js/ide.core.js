import { state } from "./ide.state.js";
import { saveProject } from "./ide.services.js";

export async function initEditor() {
  await loadMonaco();

  const container = document.getElementById("editor");
  if (!container) return;

  state.editor = monaco.editor.create(container, {
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
  const first = Object.keys(state.files)[0];
  if (first) openFile(first);
}

/* ============================== */

export function openFile(name) {
  if (!state.editor) return;
  if (!(name in state.files)) return;

  if (!state.models[name]) {
    state.models[name] = monaco.editor.createModel(
      state.files[name] || "",
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
  if (!name) return;

  state.files[name] = "";

  state.models[name] = monaco.editor.createModel("", getLanguage(name));

  state.openTabs.push(name);
  state.currentFile = name;

  if (state.editor) {
    state.editor.setModel(state.models[name]);
  }

  saveProject();
  renderTabs();
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
    else if (state.editor) state.editor.setModel(null);
  }

  renderTabs();
}

/* ============================== */

function renderTabs() {
  const tabsBar = document.getElementById("tabsBar");
  if (!tabsBar) return; // CRITICAL FIX

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

export function applyEditorSettings(settings) {
  if (!state.editor) return;

  monaco.editor.setTheme(settings.theme);

  state.editor.updateOptions({
    fontSize: settings.fontSize,
    tabSize: settings.tabSize,
    wordWrap: settings.wordWrap ? "on" : "off",
    minimap: { enabled: settings.minimap },
    lineNumbers: settings.lineNumbers ? "on" : "off",
  });
}
