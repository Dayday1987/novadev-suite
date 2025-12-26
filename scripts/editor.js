export function initEditor() {
  const container = document.getElementById('editorContainer');
  if (!container) return;

  if (window.innerWidth < 768) {
    container.innerHTML =
      '<p class="muted">Editor works best on tablet or desktop.</p>';
    return;
  }

  // Monaco initialization stays here when ready
}
