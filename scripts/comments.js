export function initComments() {
  document.querySelectorAll('.toggle-comments').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.postId;
      document
        .querySelector(`.comments-section[data-post-id="${id}"]`)
        ?.classList.toggle('hidden');
    });
  });
}
