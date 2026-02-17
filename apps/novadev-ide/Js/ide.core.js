let editor = null;

export async function initEditor() {

  if (!window.require) {
    console.error("Monaco loader not found.");
    return;
  }

  await loadMonacoAMD();

  if (!window.monaco) {
    console.error("Monaco failed to initialize.");
    return;
  }

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

function loadMonacoAMD() {
  return new Promise((resolve, reject) => {

    try {

      require.config({
        paths: { vs: "https://unpkg.com/monaco-editor@0.44.0/min/vs" }
      });

      require(["vs/editor/editor.main"], function () {
        resolve();
      }, function (err) {
        console.error("AMD load error:", err);
        reject(err);
      });

    } catch (err) {
      console.error("Monaco require crash:", err);
      reject(err);
    }

  });
}
