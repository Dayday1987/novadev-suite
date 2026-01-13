// Import cloud download utilities
import { showDownloadModal, createAndDownloadZip } from './utils.js';

// scripts/editor-embed.js — NovaDev Suite
// Enhanced version with full Clipboard and Copy/Paste support
export function initEditor() {
  const container = document.getElementById("editorContainer");
  if (!container) return;
  const runBtn = document.getElementById("editorRun");
  const saveBtn = document.getElementById("editorSave");
  const exportBtn = document.getElementById("editorExport");
  const downloadBtn = document.getElementById("editorDownloadFile");
  const preview = document.getElementById("editorPreview");
  const files = {
    "index.html": "\n<h1>Hello NovaDev!</h1>",
    "styles.css": "/* Type CSS here */\nbody { font-family: sans-serif; color: #222; }",
    "script.js": "// Type JS here\nconsole.log('NovaDev IDE running!');"
  };
  let activeFile = "index.html";
  
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
  
  // Helper function for ZIP modal
  function showZipDownloadModal(files) {
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0, 0, 0, 0.8); display: flex;
      justify-content: center; align-items: center; z-index: 10001;
    `;
    
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
      background: #1a2332; border-radius: 16px; padding: 2rem;
      max-width: 500px; width: 90%; max-height: 90vh; overflow-y: auto;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5); border: 2px solid #6EE7F7;
    `;
    
    modalContent.innerHTML = `
      <h2 style="color: #6EE7F7; margin: 0 0 1rem 0; font-size: 1.5rem;">📦 Export Project</h2>
      <p style="color: #d1dae3; margin-bottom: 1.5rem;">Choose where to save your project ZIP:</p>
      
      <div style="display: flex; flex-direction: column; gap: 0.75rem;">
        <button class="download-option" data-action="local" style="
          background: linear-gradient(90deg, #6EE7F7, #7C5CFF); color: #071422;
          border: none; padding: 1rem; border-radius: 10px; font-size: 1rem;
          font-weight: 600; cursor: pointer; display: flex; align-items: center;
          gap: 0.75rem; transition: transform 0.2s;
        ">
          <span style="font-size: 1.5rem;">💾</span>
          <div style="text-align: left; flex: 1;">
            <div>Download to Device</div>
            <div style="font-size: 0.85rem; opacity: 0.8; font-weight: 400;">Save ZIP to Downloads</div>
          </div>
        </button>
        
        <button class="download-option" data-action="gdrive" style="
          background: rgba(255, 255, 255, 0.05); color: #f0f4f8;
          border: 1px solid rgba(110, 231, 247, 0.2); padding: 1rem;
          border-radius: 10px; cursor: pointer; display: flex;
          align-items: center; gap: 0.75rem; transition: transform 0.2s, background 0.2s;
        ">
          <span style="font-size: 1.5rem;">📁</span>
          <div style="text-align: left; flex: 1;">
            <div>Save to Google Drive</div>
            <div style="font-size: 0.85rem; opacity: 0.7;">Download & upload to Drive</div>
          </div>
        </button>
        
        <button class="download-option" data-action="dropbox" style="
          background: rgba(255, 255, 255, 0.05); color: #f0f4f8;
          border: 1px solid rgba(110, 231, 247, 0.2); padding: 1rem;
          border-radius: 10px; cursor: pointer; display: flex;
          align-items: center; gap: 0.75rem; transition: transform 0.2s, background 0.2s;
        ">
          <span style="font-size: 1.5rem;">📦</span>
          <div style="text-align: left; flex: 1;">
            <div>Save to Dropbox</div>
            <div style="font-size: 0.85rem; opacity: 0.7;">Download & upload to Dropbox</div>
          </div>
        </button>
        
        <button class="download-option" data-action="onedrive" style="
          background: rgba(255, 255, 255, 0.05); color: #f0f4f8;
          border: 1px solid rgba(110, 231, 247, 0.2); padding: 1rem;
          border-radius: 10px; cursor: pointer; display: flex;
          align-items: center; gap: 0.75rem; transition: transform 0.2s, background 0.2s;
        ">
          <span style="font-size: 1.5rem;">☁️</span>
          <div style="text-align: left; flex: 1;">
            <div>Save to OneDrive</div>
            <div style="font-size: 0.85rem; opacity: 0.7;">Download & upload to OneDrive</div>
          </div>
        </button>
      </div>
      
      <button id="closeModal" style="
        margin-top: 1.5rem; width: 100%; background: transparent;
        color: #a8b5c7; border: 1px solid rgba(255, 255, 255, 0.1);
        padding: 0.75rem; border-radius: 8px; cursor: pointer; font-size: 0.95rem;
      ">Cancel</button>
    `;
    
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    // Hover effects
    const options = modalContent.querySelectorAll('.download-option');
    options.forEach(btn => {
      btn.addEventListener('mouseenter', () => {
        btn.style.transform = 'translateY(-2px)';
        if (btn.dataset.action !== 'local') btn.style.background = 'rgba(255, 255, 255, 0.1)';
      });
      btn.addEventListener('mouseleave', () => {
        btn.style.transform = 'translateY(0)';
        if (btn.dataset.action !== 'local') btn.style.background = 'rgba(255, 255, 255, 0.05)';
      });
    });
    
    // Handle actions
    modalContent.addEventListener('click', async (e) => {
      const btn = e.target.closest('.download-option');
      if (!btn) return;
      
      const action = btn.dataset.action;
      
      try {
        showToast('📦 Creating ZIP file...');
        const zipBlob = await createAndDownloadZip(files);
        const filename = `novadev-project-${Date.now()}.zip`;
        
        // Download ZIP
        const url = URL.createObjectURL(zipBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        
        // Open cloud service if needed
        if (action !== 'local') {
          setTimeout(() => {
            const urls = {
              gdrive: 'https://drive.google.com/drive/upload',
              dropbox: 'https://www.dropbox.com/home',
              onedrive: 'https://onedrive.live.com'
            };
            window.open(urls[action], '_blank');
            const names = { gdrive: 'Google Drive', dropbox: 'Dropbox', onedrive: 'OneDrive' };
            showToast(`☁️ Opening ${names[action]}... Upload your ZIP there!`);
          }, 500);
        } else {
          showToast('🎉 ZIP downloaded!');
        }
        
        modal.remove();
      } catch (error) {
        console.error('ZIP export error:', error);
        showToast('❌ Export failed: ' + error.message);
      }
    });
    
    modalContent.querySelector('#closeModal').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });
  }
  
  require.config({ paths: { vs: "https://cdn.jsdelivr.net/npm/monaco-editor@0.44.0/min/vs" } });
  require(["vs/editor/editor.main"], function () {
    const editor = monaco.editor.create(container, {
      value: files[activeFile],
      language: "html",
      theme: "vs-dark",
      automaticLayout: true,
      fontSize: 14,
      minimap: { enabled: false },
      // --- CRITICAL FOR COPY/PASTE SUPPORT ---
      contextmenu: true,           // Enables right-click "Copy/Paste"
      readOnly: false,             // Allows editing
      copyWithSyntaxHighlighting: true,
      links: true,
      autoClosingBrackets: "always",
      scrollbar: {
        vertical: 'visible',
        horizontal: 'visible'
      }
    });
    window.editorInstance = editor;
    // Load saved data
    const saved = localStorage.getItem("novadev-editor-files");
    if (saved) {
      const parsed = JSON.parse(saved);
      Object.assign(files, parsed);
      editor.setValue(files[activeFile]);
    }
    // Tab Logic
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
    // Run Logic
    runBtn.addEventListener("click", () => {
      files[activeFile] = editor.getValue();
      const output = `<html><head><style>${files["styles.css"]}</style></head><body>${files["index.html"]}<script>${files["script.js"]}<\/script></body></html>`;
      preview.srcdoc = output;
      showToast("🚀 Preview updated!");
    });
    // Save Logic
    saveBtn.addEventListener("click", () => {
      files[activeFile] = editor.getValue();
      localStorage.setItem("novadev-editor-files", JSON.stringify(files));
      showToast("💾 Saved locally!");
    });
    
    // UPDATED: Download current file with cloud options
    downloadBtn?.addEventListener("click", () => {
      files[activeFile] = editor.getValue();
      showDownloadModal(activeFile, files[activeFile], 'text');
    });
    
    // UPDATED: Zip Export with cloud options
    exportBtn.addEventListener("click", () => {
      files[activeFile] = editor.getValue();
      showZipDownloadModal(files);
    });
  });
}
