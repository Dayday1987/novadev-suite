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
    addItem(input.value);
    input.value = '';
  });

  document.getElementById('clearPrompts')?.addEventListener('click', () => {
    localStorage.removeItem('prompts');
    list.innerHTML = '';
  });

  function addItem(text) {
    const li = document.createElement('li');
    li.textContent = text;
    list.appendChild(li);
  }
}
