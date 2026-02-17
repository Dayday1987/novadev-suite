/* ide.core.js */

import { state } from './ide.state.js';
import { saveProject } from './ide.services.js';

export async function initEditor() {

  if (!window.require) {
    console.error("Monaco loader not found.");
    return;
  }

  try {
    await loadMonacoAMD();
  } catch (err) {
    console.error("Monaco failed to load:", err);
    return;
  }

  if (!window.monaco) {
    console.error("Monaco not available after load.");
    return;
  }

  const container = document.getElementById("editor");

  if (!container) {
    console.error("Editor container not found.");
    return;
  }

  state.editor = monaco.editor.create(container, {
    value: "",
    language: "javascript",
    theme: "vs-dark",
    automaticLayout: true,
    minimap: { enabled: window.innerWidth > 768 },
    fontSize: window.innerWidth < 768 ? 14 : 16
  });

  // Save on change
  state.editor.onDidChangeModelContent(() => {
    if (!state.currentFile) return;
    state.files[state.currentFile] = state.editor.getValue();
    saveProject();
  });

  // Resize safety
  window.addEventListener("resize", () => {
    if (state.editor) {
      state.editor.layout();
    }
  });

  console.log("Monaco initialized successfully.");
}

/* ==============================
   File Operations
============================== */

export function openFile(name) {

  if (!state.editor) return;
  if (!state.files[name]) return;

  state.currentFile = name;
  state.editor.setValue(state.files[name]);

  setLanguageFromFilename(name);
}

export function createFile(name, content = "") {

  if (!name) return;

  state.files[name] = content;
  state.currentFile = name;

  if (state.editor) {
    state.editor.setValue(content);
    setLanguageFromFilename(name);
  }

  saveProject();
}

function setLanguageFromFilename(name) {

  if (!state.editor) return;

  const ext = name.split('.').pop().toLowerCase();

  const map = {
    js: "javascript",
    html: "html",
    css: "css",
    json: "json",
    md: "markdown"
  };

  const language = map[ext] || "plaintext";

  monaco.editor.setModelLanguage(
    state.editor.getModel(),
    language
  );
}

/* ==============================
   Monaco Loader
============================== */

function loadMonacoAMD() {

  return new Promise((resolve, reject) => {

    try {

      require.config({
        paths: { vs: "https://unpkg.com/monaco-editor@0.44.0/min/vs" }
      });

      require(
        ["vs/editor/editor.main"],
        () => resolve(),
        (err) => {
          console.error("AMD load error:", err);
          reject(err);
        }
      );

    } catch (err) {
      console.error("Monaco require crash:", err);
      reject(err);
    }

  });

}
