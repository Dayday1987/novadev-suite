/* ide.core.js */
import { state } from "./ide.state.js";
import { saveProject, loadSettings } from "./ide.services.js";

export async function initEditor() {
  await loadMonaco();

  state.editor = monaco.editor.create(document.getElementById("editor"), {
    value: "",
    language: "html",
    theme: "vs-dark",
    automaticLayout: true,
    fontSize: 14,
    minimap: { enabled: window.innerWidth > 768 },
  });

  applySavedSettings();

  state.editor.onDidChangeModelContent(() => {
    if (!state.currentFile) return;
    state.files[state.currentFile] = state.editor.getValue();
    saveProject();
  });

  state.editor.onDidChangeCursorPosition(updateStatusBar);

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

  state.currentFile = name;
  state.editor.setValue(state.files[name] || "");

  setLanguage(name);
}

export function createFile(name) {
  state.files[name] = "";
  state.currentFile = name;
  state.editor.setValue("");
  saveProject();
}

function setLanguage(name) {
  const ext = name.split(".").pop();
  const map = {
    js: "javascript",
    html: "html",
    css: "css",
    json: "json",
    md: "markdown",
  };
  monaco.editor.setModelLanguage(
    state.editor.getModel(),
    map[ext] || "plaintext",
  );
}

/* ============================== */

export function applyEditorSettings(settings) {
  monaco.editor.setTheme(settings.theme);

  state.editor.updateOptions({
    fontSize: settings.fontSize,
    tabSize: settings.tabSize,
    wordWrap: settings.wordWrap ? "on" : "off",
    minimap: { enabled: settings.minimap },
    lineNumbers: settings.lineNumbers ? "on" : "off",
  });
}

function applySavedSettings() {
  const settings = loadSettings();
  if (!settings) return;
  applyEditorSettings(settings);
}

/* ============================== */

function updateStatusBar() {
  const pos = state.editor.getPosition();
  document.getElementById("statusPosition").textContent =
    `Ln ${pos.lineNumber}, Col ${pos.column}`;
}
