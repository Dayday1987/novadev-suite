let editor = null;

export async function initEditor() {

  await loadMonacoESM();

  editor = monaco.editor.create(document.getElementById("editor"), {
    value: "",
    language: "javascript",
    theme: "vs-dark",
    automaticLayout: true,
    minimap: { enabled: window.innerWidth > 768 }
  });

  window.addEventListener("resize", () => {
    editor.layout();
  });
}

async function loadMonacoESM() {

  if (window.monaco) return;

  await import("https://unpkg.com/monaco-editor@0.44.0/min/vs/editor/editor.main.js");

}
