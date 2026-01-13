// NovaDev Suite — Inline Live Editor
// Minimal embedded version (Tools section)

export function initEditor() {
  const container = document.getElementById("editorContainer");
  if (!container) return; // Not on this page

  // Buttons
  const runBtn = document.getElementById("editorRun");
  const saveBtn = document.getElementById("editorSave");
  const exportBtn = document.getElementById("editorExport");
  const preview = document.getElementById("editorPreview");

  // File tabs & content tracking
  const files = {
    "index.html": "<!-- Type HTML here -->\n<h1>Hello NovaDev!</h1>",
    "styles.css": "/* Type CSS here */\nbody { font-family: sans-serif; color: #222; }",
    "script.js": "// Type JS here\nconsole.log('NovaDev IDE running!');"
  };
  let activeFile = "index.html";

  // Create Monaco Editor
  require.config({ paths: { vs: "https://cdn.jsdelivr.net/npm/monaco-editor@0.44.0/min/vs" } });
  require(["vs/editor/editor.main"], function () {
    const editor = monaco.editor.create(container, {
      value: files[activeFile],
      language: "html",
      theme: "vs-dark",
      automaticLayout: true,
      fontSize: 14,
      minimap: { enabled: false }
    });

    window.addEventListener('resize', () => {
  if (window.editorInstance) {
    window.editorInstance.layout();
  }
});

    document.querySelectorAll('.file-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    setTimeout(() => window.editorInstance?.layout(), 200);
  });
});

    // Handle file tab switching
    document.querySelectorAll(".file-tab").forEach(tab => {
      tab.addEventListener("click", () => {
        // Save current file
        files[activeFile] = editor.getValue();

        // Switch
        activeFile = tab.dataset.file;
        document.querySelectorAll(".file-tab").forEach(t => t.classList.remove("active"));
        tab.classList.add("active");

        // Update editor content
        editor.setValue(files[activeFile]);
        monaco.editor.setModelLanguage(editor.getModel(),
          activeFile.endsWith(".css") ? "css" :
          activeFile.endsWith(".js") ? "javascript" : "html"
        );
      });
    });

    // Run — Build HTML output & show in preview
    runBtn.addEventListener("click", () => {
      files[activeFile] = editor.getValue();
      const output = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <style>${files["styles.css"]}</style>
        </head>
        <body>
          ${files["index.html"]}
          <script>${files["script.js"]}<\/script>
        </body>
        </html>`;
      preview.srcdoc = output;
    });

    // Save — LocalStorage
    saveBtn.addEventListener("click", () => {
      files[activeFile] = editor.getValue();
      localStorage.setItem("novadev-editor-files", JSON.stringify(files));
      alert("💾 Project saved locally!");
    });

    // Export — Create ZIP file
    exportBtn.addEventListener("click", async () => {
      files[activeFile] = editor.getValue();
      const zip = new JSZip();
      zip.file("index.html", files["index.html"]);
      zip.file("styles.css", files["styles.css"]);
      zip.file("script.js", files["script.js"]);
      const blob = await zip.generateAsync({ type: "blob" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "novadev-project.zip";
      a.click();
    });

    // Restore saved project (if any)
    const saved = localStorage.getItem("novadev-editor-files");
    if (saved) {
      Object.assign(files, JSON.parse(saved));
      editor.setValue(files[activeFile]);

      function showToast(message) {
  let toast = document.createElement('div');
  toast.textContent = message;
  toast.style.position = 'fixed';
  toast.style.bottom = '1.5rem';
  toast.style.right = '1.5rem';
  toast.style.background = '#111';
  toast.style.color = '#fff';
  toast.style.padding = '0.5rem 1rem';
  toast.style.borderRadius = '6px';
  toast.style.fontSize = '0.9rem';
  toast.style.opacity = '0';
  toast.style.transition = 'opacity 0.3s';
  toast.style.zIndex = '9999';
  document.body.appendChild(toast);
  requestAnimationFrame(() => (toast.style.opacity = '1'));
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 2000);
}
    }
  });
}
