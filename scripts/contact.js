export function initContactForms() {
  document.querySelectorAll('.contact-form').forEach(form => {
    form.addEventListener('submit', e => {
      e.preventDefault();

      const btn = form.querySelector('button[type="submit"]');
      const label = btn.textContent;

      btn.textContent = 'Sent ✓';
      btn.disabled = true;

      setTimeout(() => {
        btn.textContent = label;
        btn.disabled = false;
        form.reset();
      }, 2000);
    });
  });
}
