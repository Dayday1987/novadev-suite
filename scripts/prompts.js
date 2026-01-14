// Import cloud download utilities
import { showToast, showDownloadModal } from './utils.js';

export function initPromptLibrary() {
  const input = document.getElementById('promptInput');
  const list = document.getElementById('promptList');
  if (!input || !list) return;
  const prompts = JSON.parse(localStorage.getItem('prompts') || '[]');
  prompts.forEach(addItem);
  
  document.getElementById('savePrompt')?.addEventListener('click', () => {
    if (!input.value.trim()) return;
    prompts.push(input.value);
    localStorage.setItem('prompts', JSON.stringify(prompts));
    addItem(input.value, prompts.length - 1);
    input.value = '';
    showToast('💾 Prompt saved!');
  });
  
  document.getElementById('clearPrompts')?.addEventListener('click', () => {
    if (prompts.length === 0) return;
    // ✅ FIXED: Added parentheses for confirm()
    if (confirm(`Clear all ${prompts.length} prompts?`)) {
      localStorage.removeItem('prompts');
      list.innerHTML = '';
      prompts.length = 0;
      showToast('🗑️ All prompts cleared');
    }
  });
  
  function addItem(text, index) {
    const li = document.createElement('li');
    
    // Text span
    const textSpan = document.createElement('span');
    textSpan.textContent = text;
    textSpan.style.flex = '1';
    
    // Actions container
    const actions = document.createElement('div');
    actions.style.display = 'flex';
    actions.style.gap = '8px';
    
    // Copy button
    const copyBtn = document.createElement('button');
    copyBtn.textContent = '📋';
    copyBtn.className = 'btn ghost';
    copyBtn.style.padding = '4px 8px';
    copyBtn.title = 'Copy to clipboard';
    copyBtn.onclick = async (e) => {
      e.stopPropagation();
      try {
        await navigator.clipboard.writeText(text);
        showToast('📋 Copied to clipboard!');
      } catch (error) {
        showToast('❌ Copy failed', 'error');
      }
    };
    
    // Download button with cloud options
    const downloadBtn = document.createElement('button');
    downloadBtn.textContent = '⬇️';
    downloadBtn.className = 'btn ghost';
    downloadBtn.style.padding = '4px 8px';
    downloadBtn.title = 'Download prompt';
    downloadBtn.onclick = (e) => {
      e.stopPropagation();
      const promptIndex = Array.from(list.children).indexOf(li) + 1;
      // ✅ FIXED: Added parentheses for function call
      showDownloadModal(`prompt-${promptIndex}.txt`, text, 'text');
    };
    
    // Delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = '🗑️';
    deleteBtn.className = 'btn ghost';
    deleteBtn.style.padding = '4px 8px';
    deleteBtn.title = 'Delete prompt';
    deleteBtn.onclick = (e) => {
      e.stopPropagation();
      if (confirm('Delete this prompt?')) {
        const promptIndex = Array.from(list.children).indexOf(li);
        prompts.splice(promptIndex, 1);
        localStorage.setItem('prompts', JSON.stringify(prompts));
        li.remove();
        showToast('🗑️ Prompt deleted');
      }
    };
    
    actions.appendChild(copyBtn);
    actions.appendChild(downloadBtn);
    actions.appendChild(deleteBtn);
    
    li.appendChild(textSpan);
    li.appendChild(actions);
    list.appendChild(li);
  }
}
