// ============================================================
// scripts/utils.js — Shared Utilities for NovaDev Suite
// ============================================================

/**
 * Show a toast notification
 */
export function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.textContent = message;
  const bgColor = type === 'success' ? '#1a2332' : '#2d1a1a';
  const borderColor = type === 'success' ? '#6EE7F7' : '#ff6b6b';
  
  toast.style.cssText = `
    position: fixed;
    bottom: 2rem;
    right: 2rem;
    background: ${bgColor};
    color: #fff;
    padding: 1rem 1.5rem;
    border-radius: 8px;
    font-size: 0.95rem;
    opacity: 0;
    transition: opacity 0.3s ease;
    z-index: 10000;
    border: 2px solid ${borderColor};
    box-shadow: 0 8px 24px rgba(0,0,0,0.4);
    font-family: inherit;
  `;
  
  document.body.appendChild(toast);
  requestAnimationFrame(() => (toast.style.opacity = '1'));
  
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

/**
 * Download a file to the user's device
 */
export function downloadFile(filename, content, mimeType = 'text/plain') {
  try {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return true;
  } catch (error) {
    console.error('Download error:', error);
    return false;
  }
}

/**
 * Show download modal with cloud options
 */
export function showDownloadModal(filename, content, type = 'text') {
  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 10001;
  `;
  
  const modalContent = document.createElement('div');
  modalContent.style.cssText = `
    background: #1a2332;
    border-radius: 16px;
    padding: 2rem;
    max-width: 500px;
    width: 90%;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
    border: 2px solid #6EE7F7;
  `;
  
  const isImage = type === 'image';
  
  modalContent.innerHTML = `
    <h2 style="color: #6EE7F7; margin: 0 0 1rem 0; font-size: 1.5rem;">
      ${isImage ? '🎨 Save Meme' : '📥 Download File'}
    </h2>
    <p style="color: #d1dae3; margin-bottom: 1.5rem;">
      Choose where to save ${filename}:
    </p>
    
    <div style="display: flex; flex-direction: column; gap: 0.75rem;">
      <button class="download-option" data-action="local" style="
        background: linear-gradient(90deg, #6EE7F7, #7C5CFF);
        color: #071422;
        border: none;
        padding: 1rem;
        border-radius: 10px;
        font-size: 1rem;
        font-weight: 600;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 0.75rem;
        transition: transform 0.2s;
      ">
        <span style="font-size: 1.5rem;">💾</span>
        <div style="text-align: left; flex: 1;">
          <div>Download to Device</div>
          <div style="font-size: 0.85rem; opacity: 0.8; font-weight: 400;">Save to Downloads folder</div>
        </div>
      </button>
      
      <button class="download-option" data-action="gdrive" style="
        background: rgba(255, 255, 255, 0.05);
        color: #f0f4f8;
        border: 1px solid rgba(110, 231, 247, 0.2);
        padding: 1rem;
        border-radius: 10px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 0.75rem;
        transition: transform 0.2s, background 0.2s;
      ">
        <span style="font-size: 1.5rem;">📁</span>
        <div style="text-align: left; flex: 1;">
          <div>Save to Google Drive</div>
          <div style="font-size: 0.85rem; opacity: 0.7;">Download & upload to Drive</div>
        </div>
      </button>
      
      <button class="download-option" data-action="dropbox" style="
        background: rgba(255, 255, 255, 0.05);
        color: #f0f4f8;
        border: 1px solid rgba(110, 231, 247, 0.2);
        padding: 1rem;
        border-radius: 10px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 0.75rem;
        transition: transform 0.2s, background 0.2s;
      ">
        <span style="font-size: 1.5rem;">📦</span>
        <div style="text-align: left; flex: 1;">
          <div>Save to Dropbox</div>
          <div style="font-size: 0.85rem; opacity: 0.7;">Download & upload to Dropbox</div>
        </div>
      </button>
      
      <button class="download-option" data-action="onedrive" style="
        background: rgba(255, 255, 255, 0.05);
        color: #f0f4f8;
        border: 1px solid rgba(110, 231, 247, 0.2);
        padding: 1rem;
        border-radius: 10px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 0.75rem;
        transition: transform 0.2s, background 0.2s;
      ">
        <span style="font-size: 1.5rem;">☁️</span>
        <div style="text-align: left; flex: 1;">
          <div>Save to OneDrive</div>
          <div style="font-size: 0.85rem; opacity: 0.7;">Download & upload to OneDrive</div>
        </div>
      </button>
      
      ${!isImage ? `
      <button class="download-option" data-action="clipboard" style="
        background: rgba(255, 255, 255, 0.05);
        color: #f0f4f8;
        border: 1px solid rgba(110, 231, 247, 0.2);
        padding: 1rem;
        border-radius: 10px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 0.75rem;
        transition: transform 0.2s, background 0.2s;
      ">
        <span style="font-size: 1.5rem;">📋</span>
        <div style="text-align: left; flex: 1;">
          <div>Copy to Clipboard</div>
          <div style="font-size: 0.85rem; opacity: 0.7;">Copy text content</div>
        </div>
      </button>
      ` : ''}
    </div>
    
    <button id="closeModal" style="
      margin-top: 1.5rem;
      width: 100%;
      background: transparent;
      color: #a8b5c7;
      border: 1px solid rgba(255, 255, 255, 0.1);
      padding: 0.75rem;
      border-radius: 8px;
      cursor: pointer;
      font-size: 0.95rem;
    ">Cancel</button>
  `;
  
  modal.appendChild(modalContent);
  document.body.appendChild(modal);
  
  // Add hover effects
  const options = modalContent.querySelectorAll('.download-option');
  options.forEach(btn => {
    btn.addEventListener('mouseenter', () => {
      btn.style.transform = 'translateY(-2px)';
      if (btn.dataset.action !== 'local') {
        btn.style.background = 'rgba(255, 255, 255, 0.1)';
      }
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.transform = 'translateY(0)';
      if (btn.dataset.action !== 'local') {
        btn.style.background = 'rgba(255, 255, 255, 0.05)';
      }
    });
  });
  
  // Handle actions
  modalContent.addEventListener('click', async (e) => {
    const btn = e.target.closest('.download-option');
    if (!btn) return;
    
    const action = btn.dataset.action;
    
    try {
      switch (action) {
        case 'local':
          if (isImage) {
            content.toBlob((blob) => {
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = filename;
              a.click();
              URL.revokeObjectURL(url);
            }, 'image/png');
          } else {
            downloadFile(filename, content, 'text/plain');
          }
          showToast('✅ Download complete!');
          break;
          
        case 'clipboard':
          if (!isImage) {
            await navigator.clipboard.writeText(content);
            showToast('📋 Copied to clipboard!');
          }
          break;
          
        case 'gdrive':
        case 'dropbox':
        case 'onedrive':
          // Download first
          if (isImage) {
            content.toBlob((blob) => {
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = filename;
              a.click();
              URL.revokeObjectURL(url);
            }, 'image/png');
          } else {
            downloadFile(filename, content, 'text/plain');
          }
          
          // Open cloud service
          setTimeout(() => {
            const urls = {
              gdrive: 'https://drive.google.com/drive/upload',
              dropbox: 'https://www.dropbox.com/home',
              onedrive: 'https://onedrive.live.com'
            };
            window.open(urls[action], '_blank');
            const names = { gdrive: 'Google Drive', dropbox: 'Dropbox', onedrive: 'OneDrive' };
            showToast(`☁️ Opening ${names[action]}... Upload your downloaded file there!`);
          }, 500);
          break;
      }
      
      modal.remove();
      
    } catch (error) {
      console.error('Action error:', error);
      showToast('❌ Action failed: ' + error.message, 'error');
    }
  });
  
  // Close handlers
  modalContent.querySelector('#closeModal').addEventListener('click', () => modal.remove());
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });
}

/**
 * Create and download a ZIP file
 */
export async function createAndDownloadZip(files, filename = 'project.zip') {
  if (typeof JSZip === 'undefined') {
    throw new Error('JSZip library not loaded');
  }
  
  const zip = new JSZip();
  
  // Add files to ZIP
  for (const [name, content] of Object.entries(files)) {
    zip.file(name, content);
  }
  
  // Add README
  zip.file("README.md", `# NovaDev Project

Created with NovaDev IDE

## Files
${Object.keys(files).map(f => `- ${f}`).join('\n')}

Created on: ${new Date().toLocaleString()}
`);
  
  // Generate ZIP
  const content = await zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
    compressionOptions: { level: 9 }
  });
  
  return content;
}
