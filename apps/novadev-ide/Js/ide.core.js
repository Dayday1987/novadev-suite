/* ide.core.js */
let editor = null;

export async function initEditor() {

  await loadMonaco();

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

function loadMonaco() {
  return new Promise((resolve, reject) => {

    require.config({
      paths: { vs: "https://unpkg.com/monaco-editor@0.44.0/min/vs" }
    });

    require(["vs/editor/editor.main"], () => {
      resolve();
    }, reject);

  });
}
