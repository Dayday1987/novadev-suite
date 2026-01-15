// NovaDev Suite — Inline Live Editor
// Full working version with cloud storage support
console.log("🧩 editor-embed.js loaded");
export function initEditor() {
  const container = document.getElementById("editorContainer");
  if (!container) return;

  console.log('📝 Editor initializing...');

  const runBtn = document.getElementById("editorRun");
  const saveBtn = document.getElementById("editorSave");
  const exportBtn = document.getElementById("editorExport");
  const preview = document.getElementById("editorPreview");

  if (!runBtn || !saveBtn || !exportBtn || !preview) {
    console.error('Missing editor elements');
    return;
  }

  const files = {
    "index.html": "<h1>Hello NovaDev!</h1>\n<p>Edit me!</p>",
    "styles.css": "/* Type CSS here */\nbody { \n  font-family: sans-serif; \n  color: #222; \n  padding: 20px;\n}",
    "script.js": "// Type JS here\nconsole.log('NovaDev IDE running!');"
  };
  
  let activeFile = "index.html";

  // Cloud storage modal
  function showCloudExportModal() {
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0, 0, 0, 0.8); display: flex;
      justify-content: center; align-items: center; z-index: 10001;
    `;
    
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
      background: #1a2332; border-radius: 16px; padding: 2rem;
      max-width: 500px; width: 90%; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
      border: 2px solid #6EE7F7;
    `;
    
    modalContent.innerHTML = `
      <h2 style="color: #6EE7F7; margin: 0 0 1rem 0;">📦 Export Project</h2>
      <p style="color: #d1dae3; margin-bottom: 1.5rem;">Choose where to save your ZIP:</p>
      
      <div style="display: flex; flex-direction: column; gap: 0.75rem;">
        <button class="export-option" data-action="local" style="
          background: linear-gradient(90deg, #6EE7F7, #7C5CFF); color: #071422;
          border: none; padding: 1rem; border-radius: 10px; font-size: 1rem;
          font-weight: 600; cursor: pointer; display: flex; align-items: center;
          gap: 0.75rem;
        ">
          <span style="font-size: 1.5rem;">💾</span>
          <div style="text-align: left; flex: 1;">
            <div>Download to Device</div>
            <div style="font-size: 0.85rem; opacity: 0.8; font-weight: 400;">Save ZIP to Downloads</div>
          </div>
        </button>
        
        <button class="export-option" data-action="gdrive" style="
          background: rgba(255, 255, 255, 0.05); color: #f0f4f8;
          border: 1px solid rgba(110, 231, 247, 0.2); padding: 1rem;
          border-radius: 10px; cursor: pointer; display: flex; align-items: center; gap: 0.75rem;
        ">
          <span style="font-size: 1.5rem;">📁</span>
          <div style="text-align: left; flex: 1;">
            <div>Google Drive</div>
            <div style="font-size: 0.85rem; opacity: 0.7;">Download & upload to Drive</div>
          </div>
        </button>
        
        <button class="export-option" data-action="onedrive" style="
          background: rgba(255, 255, 255, 0.05); color: #f0f4f8;
          border: 1px solid rgba(110, 231, 247, 0.2); padding: 1rem;
          border-radius: 10px; cursor: pointer; display: flex; align-items: center; gap: 0.75rem;
        ">
          <span style="font-size: 1.5rem;">☁️</span>
          <div style="text-align: left; flex: 1;">
            <div>OneDrive</div>
            <div style="font-size: 0.85rem; opacity: 0.7;">Download & upload to OneDrive</div>
          </div>
        </button>
        
        <button class="export-option" data-action="dropbox" style="
          background: rgba(255, 255, 255, 0.05); color: #f0f4f8;
          border: 1px solid rgba(110, 231, 247, 0.2); padding: 1rem;
          border-radius: 10px; cursor: pointer; display: flex; align-items: center; gap: 0.75rem;
        ">
          <span style="font-size: 1.5rem;">📦</span>
          <div style="text-align: left; flex: 1;">
            <div>Dropbox</div>
            <div style="font-size: 0.85rem; opacity: 0.7;">Download & upload to Dropbox</div>
          </div>
        </button>
      </div>
      
      <button id="closeModal" style="
        margin-top: 1.5rem; width: 100%; background: transparent;
        color: #a8b5c7; border: 1px solid rgba(255, 255, 255, 0.1);
        padding: 0.75rem; border-radius: 8px; cursor: pointer;
      ">Cancel</button>
    `;
    
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    // Handle export actions
    modalContent.addEventListener('click', async (e) => {
      const btn = e.target.closest('.export-option');
      if (!btn) return;
      
      const action = btn.dataset.action;
      
      try {
        // Save current file
        files[activeFile] = window.editorInstance ? window.editorInstance.getValue() : files[activeFile];
        
        // Create ZIP
        if (typeof JSZip === 'undefined') {
          alert('JSZip library not loaded');
          return;
        }
        
        const zip = new JSZip();
        zip.file("index.html", files["index.html"]);
        zip.file("styles.css", files["styles.css"]);
        zip.file("script.js", files["script.js"]);
        zip.file("README.md", `# NovaDev Project\n\nCreated with NovaDev IDE\n\nDate: ${new Date().toLocaleString()}`);
        
        const blob = await zip.generateAsync({ type: "blob" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `novadev-project-${Date.now()}.zip`;
        a.click();
        URL.revokeObjectURL(url);
        
        // Open cloud service if needed
        if (action !== 'local') {
          setTimeout(() => {
            const urls = {
              gdrive: 'https://drive.google.com/drive/upload',
              onedrive: 'https://onedrive.live.com',
              dropbox: 'https://www.dropbox.com/home'
            };
            window.open(urls[action], '_blank');
          }, 500);
        }
        
        modal.remove();
      } catch (error) {
        console.error('Export error:', error);
        alert('Export failed: ' + error.message);
      }
    });
    
    modalContent.querySelector('#closeModal').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });
  }

  // Initialize Monaco Editor
  require.config({ paths: { vs: "https://cdn.jsdelivr.net/npm/monaco-editor@0.44.0/min/vs" } });
  require(["vs/editor/editor.main"], function () {
    console.log('✅ Monaco loaded');
    
    const editor = monaco.editor.create(container, {
      value: files[activeFile],
      language: "html",
      theme: "vs-dark",
      automaticLayout: true,
      fontSize: 14,
      minimap: { enabled: false },
      contextmenu: true,
      readOnly: false,
      scrollbar: { vertical: 'visible', horizontal: 'visible' }
    });
    
    window.editorInstance = editor;

    // Load saved files from localStorage
    const saved = localStorage.getItem("novadev-editor-files");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        Object.assign(files, parsed);
        editor.setValue(files[activeFile]);
        console.log('✅ Loaded saved files');
      } catch (e) {
        console.error('Failed to load saved files:', e);
      }
    }

    // Tab switching
    document.querySelectorAll(".file-tab").forEach(tab => {
      tab.addEventListener("click", () => {
        files[activeFile] = editor.getValue();
        activeFile = tab.dataset.file;
        
        document.querySelectorAll(".file-tab").forEach(t => t.classList.remove("active"));
        tab.classList.add("active");
        
        editor.setValue(files[activeFile]);
        
        const language = activeFile.endsWith(".css") ? "css" : 
                        activeFile.endsWith(".js") ? "javascript" : "html";
        monaco.editor.setModelLanguage(editor.getModel(), language);
        
        console.log(`Switched to ${activeFile}`);
      });
    });

    // Run button - Update preview
    runBtn.addEventListener("click", () => {
      console.log('▶️ Running...');
      files[activeFile] = editor.getValue();
      
      const output = `<!DOCTYPE html>
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
      console.log('✅ Preview updated');
    });

    // Save button - Save to localStorage
    saveBtn.addEventListener("click", () => {
      console.log('💾 Saving...');
      files[activeFile] = editor.getValue();
      localStorage.setItem("novadev-editor-files", JSON.stringify(files));
      
      const original = saveBtn.textContent;
      saveBtn.textContent = '✓ Saved';
      setTimeout(() => { saveBtn.textContent = original; }, 1500);
      
      console.log('✅ Saved');
    });

    // Export button - Show cloud storage modal
    exportBtn.addEventListener("click", () => {
      console.log('📦 Exporting...');
      showCloudExportModal();
    });

    console.log('✅ Editor fully initialized');
  });
}
