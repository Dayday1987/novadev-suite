export function initComments() {
  document.querySelectorAll('.toggle-comments').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.postId;
      // ✅ FIXED: Changed template literal to parentheses
      document
        .querySelector(`.comments-section[data-post-id="${id}"]`)
        ?.classList.toggle('hidden');
    });
  });
}
