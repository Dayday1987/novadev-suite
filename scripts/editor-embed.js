// NovaDev Suite — Inline Live Editor
// Fixed version with global scoping for buttons

export function initEditor() {
  const container = document.getElementById("editorContainer");
  if (!container) return;

  const runBtn = document.getElementById("editorRun");
  const saveBtn = document.getElementById("editorSave");
  const exportBtn = document.getElementById("editorExport");
  const preview = document.getElementById("editorPreview");

  const files = {
    "index.html": "\n<h1>Hello NovaDev!</h1>",
    "styles.css": "/* Type CSS here */\nbody { font-family: sans-serif; color: #222; }",
    "script.js": "// Type JS here\nconsole.log('NovaDev IDE running!');"
  };
  let activeFile = "index.html";

  // Helper function moved to top-level scope of initEditor
  function showToast(message) {
    let toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = "position:fixed; bottom:1.5rem; right:1.5rem; background:#111; color:#fff; padding:0.5rem 1rem; border-radius:6px; font-size:0.9rem; opacity:0; transition:opacity 0.3s; z-index:9999; border:1px solid #6EE7F7;";
    document.body.appendChild(toast);
    requestAnimationFrame(() => (toast.style.opacity = '1'));
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 2000);
  }

  // Load Monaco
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

    // CRITICAL FIX: Assign the instance to the window
    window.editorInstance = editor;

    // Restore saved project logic
    const saved = localStorage.getItem("novadev-editor-files");
    if (saved) {
      Object.assign(files, JSON.parse(saved));
      editor.setValue(files[activeFile]);
    }

    // Handle file tab switching
    document.querySelectorAll(".file-tab").forEach(tab => {
      tab.addEventListener("click", () => {
        files[activeFile] = editor.getValue();
        activeFile = tab.dataset.file;
        
        document.querySelectorAll(".file-tab").forEach(t => t.classList.remove("active"));
        tab.classList.add("active");

        editor.setValue(files[activeFile]);
        monaco.editor.setModelLanguage(editor.getModel(),
          activeFile.endsWith(".css") ? "css" :
          activeFile.endsWith(".js") ? "javascript" : "html"
        );
      });
    });

    // Run Button
    runBtn.addEventListener("click", () => {
      files[activeFile] = editor.getValue();
      const output = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>${files["styles.css"]}</style>
        </head>
        <body>
          ${files["index.html"]}
          <script>${files["script.js"]}<\/script>
        </body>
        </html>`;
      preview.srcdoc = output;
      showToast("🚀 Code Updated!");
    });

    // Save Button
    saveBtn.addEventListener("click", () => {
      files[activeFile] = editor.getValue();
      localStorage.setItem("novadev-editor-files", JSON.stringify(files));
      showToast("💾 Project saved locally!");
    });

    // Export Button
    exportBtn.addEventListener("click", async () => {
      files[activeFile] = editor.getValue();
      const zip = new JSZip();
      zip.file("index.html", files["index.html"]);
      zip.file("styles.css", files["styles.css"]);
      zip.file("script.js", files["script.js"]);

      try {
        const blob = await zip.generateAsync({ type: "blob" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "novadev-project.zip";
        a.click();
        showToast("📦 Exported ZIP ready!");
      } catch (err) {
        showToast("❌ Failed to export");
      }
    });
  });
}
