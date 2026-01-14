// editor-embed.js - Simple embedded editor for main page (no cloud storage)

export function initEditor() {
  console.log('📝 Editor init starting...');
  
  const container = document.getElementById("editorContainer");
  
  // Exit early if editor container doesn't exist
  if (!container) {
    console.log('ℹ️ Editor container not found - skipping');
    return;
  }
  
  const runBtn = document.getElementById("editorRun");
  const saveBtn = document.getElementById("editorSave");
  const exportBtn = document.getElementById("editorExport");
  const downloadBtn = document.getElementById("editorDownloadFile");
  const preview = document.getElementById("editorPreview");
  
  // Check if all required elements exist
  if (!runBtn || !saveBtn || !exportBtn || !preview) {
    console.error('❌ Editor: Missing required buttons or preview');
    return;
  }
  
  const files = {
    "index.html": "<h1>Hello NovaDev!</h1>\n<p>Edit me!</p>",
    "styles.css": "/* Type CSS here */\nbody { \n  font-family: sans-serif; \n  color: #222; \n  padding: 20px;\n}",
    "script.js": "// Type JS here\nconsole.log('NovaDev IDE running!');"
  };
  
  let activeFile = "index.html";
  
  console.log('📦 Loading Monaco Editor...');
  
  // Configure Monaco Editor
  require.config({ 
    paths: { 
      vs: "https://cdn.jsdelivr.net/npm/monaco-editor@0.44.0/min/vs" 
    } 
  });
  
  require(["vs/editor/editor.main"], function () {
    console.log('✅ Monaco loaded, creating editor...');
    
    const editor = monaco.editor.create(container, {
      value: files[activeFile],
      language: "html",
      theme: "vs-dark",
      automaticLayout: true,
      fontSize: 14,
      minimap: { enabled: false },
      contextmenu: true,
      readOnly: false,
      copyWithSyntaxHighlighting: true,
      links: true,
      autoClosingBrackets: "always",
      scrollbar: {
        vertical: 'visible',
        horizontal: 'visible'
      }
    });
    
    window.editorInstance = editor;
    console.log('✅ Editor created');
    
    // Load saved data from localStorage
    const saved = localStorage.getItem("novadev-editor-files");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        Object.assign(files, parsed);
        editor.setValue(files[activeFile]);
        console.log('✅ Loaded saved files from localStorage');
      } catch (error) {
        console.error('❌ Failed to load saved files:', error);
      }
    }
    
    // Tab switching logic
    document.querySelectorAll(".file-tab").forEach(tab => {
      tab.addEventListener("click", () => {
        // Save current file content
        files[activeFile] = editor.getValue();
        
        // Switch to new file
        activeFile = tab.dataset.file;
        
        // Update UI
        document.querySelectorAll(".file-tab").forEach(t => t.classList.remove("active"));
        tab.classList.add("active");
        
        // Load new file content
        editor.setValue(files[activeFile]);
        
        // Set correct language
        const language = activeFile.endsWith(".css") ? "css" : 
                        activeFile.endsWith(".js") ? "javascript" : "html";
        monaco.editor.setModelLanguage(editor.getModel(), language);
        
        console.log(`📄 Switched to ${activeFile}`);
      });
    });
    
    // Run button - Update preview
    runBtn.addEventListener("click", () => {
      console.log('▶️ Running code...');
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
      console.log('✅ Preview updated');
    });
    
    // Save button - Save to localStorage
    saveBtn.addEventListener("click", () => {
      console.log('💾 Saving...');
      files[activeFile] = editor.getValue();
      localStorage.setItem("novadev-editor-files", JSON.stringify(files));
      
      // Visual feedback
      const originalText = saveBtn.textContent;
      saveBtn.textContent = '✓ Saved';
      setTimeout(() => {
        saveBtn.textContent = originalText;
      }, 1500);
      
      console.log('✅ Saved to localStorage');
    });
    
    // Download current file (simple version)
    if (downloadBtn) {
      downloadBtn.addEventListener("click", () => {
        console.log('⬇️ Downloading current file...');
        files[activeFile] = editor.getValue();
        
        const blob = new Blob([files[activeFile]], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = activeFile;
        a.click();
        URL.revokeObjectURL(url);
        
        console.log(`✅ Downloaded ${activeFile}`);
      });
    }
    
    // Export ZIP (simple version using JSZip)
    exportBtn.addEventListener("click", async () => {
      console.log('📦 Creating ZIP...');
      files[activeFile] = editor.getValue();
      
      // Check if JSZip is loaded
      if (typeof JSZip === 'undefined') {
        alert('JSZip library not loaded. Cannot create ZIP.');
        console.error('❌ JSZip not found');
        return;
      }
      
      try {
        const zip = new JSZip();
        
        // Add all files to ZIP
        for (const [filename, content] of Object.entries(files)) {
          zip.file(filename, content);
        }
        
        // Add README
        zip.file('README.md', `# NovaDev Project

Created with NovaDev IDE

Files:
- index.html
- styles.css
- script.js

Created on: ${new Date().toLocaleString()}
`);
        
        // Generate ZIP
        const zipBlob = await zip.generateAsync({
          type: 'blob',
          compression: 'DEFLATE',
          compressionOptions: { level: 9 }
        });
        
        // Download ZIP
        const url = URL.createObjectURL(zipBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `novadev-project-${Date.now()}.zip`;
        a.click();
        URL.revokeObjectURL(url);
        
        console.log('✅ ZIP downloaded');
        
        // Visual feedback
        const originalText = exportBtn.textContent;
        exportBtn.textContent = '✓ Exported';
        setTimeout(() => {
          exportBtn.textContent = originalText;
        }, 1500);
        
      } catch (error) {
        console.error('❌ ZIP creation failed:', error);
        alert('Failed to create ZIP: ' + error.message);
      }
    });
    
    console.log('✅ Editor fully initialized');
  });
}
