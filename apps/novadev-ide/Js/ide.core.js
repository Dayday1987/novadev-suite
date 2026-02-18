import { state } from "./ide.state.js";
import { readFile, writeFile, listEntries } from "./ide.fs.js";

/* ==============================
   Init Editor
============================== */

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

  state.editor.onDidChangeModelContent(async () => {
    if (!state.currentFile || !state.currentProjectId) return;

    const content = state.editor.getValue();

    await writeFile(
      state.currentProjectId,
      state.currentFile,
      content
    );

    updatePreview();
  });

  await openFirstFile();
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

/* ==============================
   Open First File
============================== */

async function openFirstFile() {
  if (!state.currentProjectId) return;

  const entries = await listEntries(state.currentProjectId);
  const firstFile = entries.find(e => e.type === "file");

  if (firstFile) {
    await openFile(firstFile.path);
  }
}

/* ==============================
   Open File
============================== */

export async function openFile(path) {
  if (!state.editor || !state.currentProjectId) return;

  const content = await readFile(state.currentProjectId, path);
  if (content === null) return;

  if (!state.models[path]) {
    state.models[path] = monaco.editor.createModel(
      content,
      getLanguage(path)
    );
  }

  state.editor.setModel(state.models[path]);
  state.currentFile = path;

  if (!state.openTabs.includes(path)) {
    state.openTabs.push(path);
  }

  renderTabs();
}

/* ==============================
   Create File
============================== */

export async function createFile(path) {
  if (!state.currentProjectId || !path) return;

  await writeFile(state.currentProjectId, path, "");

  await openFile(path);
}

/* ==============================
   Close Tab
============================== */

export function closeTab(path) {
  const index = state.openTabs.indexOf(path);
  if (index > -1) state.openTabs.splice(index, 1);

  if (state.currentFile === path) {
    const next = state.openTabs[state.openTabs.length - 1];
    if (next) openFile(next);
    else state.editor.setModel(null);
  }

  renderTabs();
}

/* ==============================
   Render Tabs
============================== */

function renderTabs() {
  const tabsBar = document.getElementById("tabsBar");
  if (!tabsBar) return;

  tabsBar.innerHTML = "";

  state.openTabs.forEach(path => {
    const tab = document.createElement("div");
    tab.className = "tab";

    if (path === state.currentFile) {
      tab.classList.add("active");
    }

    tab.textContent = path;

    const close = document.createElement("span");
    close.className = "tab-close";
    close.textContent = "×";

    close.onclick = (e) => {
      e.stopPropagation();
      closeTab(path);
    };

    tab.appendChild(close);
    tab.onclick = () => openFile(path);

    tabsBar.appendChild(tab);
  });
}

/* ==============================
   Language Detection
============================== */

function getLanguage(path) {
  const ext = path.split(".").pop();
  const map = {
    js: "javascript",
    html: "html",
    css: "css",
    json: "json",
    md: "markdown",
  };
  return map[ext] || "plaintext";
}

/* ==============================
   Settings
============================== */

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

/* ==============================
   Live Preview
============================== */

export async function updatePreview() {
  const preview = document.getElementById("previewPane");
  if (!preview || !state.currentProjectId) return;

  const entries = await listEntries(state.currentProjectId);

  const html = await readFile(state.currentProjectId, "index.html") || "";
  const css = await readFile(state.currentProjectId, "style.css") || "";
  const js =
    await readFile(state.currentProjectId, "script.js") ||
    await readFile(state.currentProjectId, "main.js") ||
    "";

  const fullDoc = `
    <html>
      <head>
        <style>${css}</style>
      </head>
      <body>
        ${html}
        <script>${js}<\/script>
      </body>
    </html>
  `;

  preview.srcdoc = fullDoc;
}
