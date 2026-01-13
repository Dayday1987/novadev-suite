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
      <button class="download-option" data-action="local">💾 Download to Device</button>
      <button class="download-option" data-action="gdrive">📁 Save to Google Drive</button>
      <button class="download-option" data-action="dropbox">📦 Save to Dropbox</button>
      <button class="download-option" data-action="onedrive">☁️ Save to OneDrive</button>
      ${!isImage ? `<button class="download-option" data-action="clipboard">📋 Copy to Clipboard</button>` : ''}
    </div>

    <button id="closeModal" style="margin-top:1.5rem;width:100%;">Cancel</button>
  `;

  modal.appendChild(modalContent);
  document.body.appendChild(modal);

  modalContent.addEventListener('click', async (e) => {
    const btn = e.target.closest('.download-option');
    if (!btn) return;

    const action = btn.dataset.action;

    try {
      switch (action) {
        case 'local':
          if (isImage) {
            if (!(content instanceof HTMLCanvasElement)) {
              throw new Error('Expected canvas content for image download');
            }

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
          if (isImage) {
            if (!(content instanceof HTMLCanvasElement)) {
              throw new Error('Expected canvas content for image download');
            }

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

          setTimeout(() => {
            const urls = {
              gdrive: 'https://drive.google.com/drive/upload',
              dropbox: 'https://www.dropbox.com/home',
              onedrive: 'https://onedrive.live.com'
            };
            window.open(urls[action], '_blank');
            showToast(`☁️ Opening ${action}...`);
          }, 500);
          break;
      }

      modal.remove();

    } catch (error) {
      console.error('Download action failed:', error);
      showToast('❌ ' + error.message, 'error');
    }
  });

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

  for (const [name, content] of Object.entries(files)) {
    zip.file(name, content);
  }

  zip.file(
    'README.md',
    `# NovaDev Project

Created with NovaDev IDE

Files:
${Object.keys(files).map(f => `- ${f}`).join('\n')}

Created on: ${new Date().toLocaleString()}
`
  );

  return await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 }
  });
}
