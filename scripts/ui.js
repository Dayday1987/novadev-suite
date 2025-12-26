export function initUI() {
  initHamburger();
  initReveal();
  initClock();
}

function initHamburger() {
  const btn = document.querySelector('.hamburger');
  const nav = document.querySelector('.nav');
  if (!btn || !nav) return;

  btn.addEventListener('click', () => {
    nav.classList.toggle('open');
  });
}

function initReveal() {
  const els = document.querySelectorAll('.reveal');
  if (!els.length) return;

  const io = new IntersectionObserver(
    entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('visible');
          io.unobserve(e.target);
        }
      });
    },
    { threshold: 0.1 }
  );

  els.forEach(el => io.observe(el));
}

function initClock() {
  const clock = document.getElementById('liveClock');
  if (!clock) return;

  const update = () =>
    (clock.textContent = new Date().toLocaleTimeString());

  update();
  setInterval(update, 1000);

  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();
}
