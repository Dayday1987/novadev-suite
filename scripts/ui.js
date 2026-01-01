export function initUI() {
  initHamburger();
  initReveal();
  initClock();
}

/* 1. Hide hamburger on Desktop */
.hamburger {
  display: none; 
}

/* 2. Show hamburger and adjust Nav on Mobile */
@media (max-width: 768px) {
  .hamburger {
    display: block; /* Make button appear */
    background: none;
    border: none;
    color: var(--text-primary);
    font-size: 24px;
    cursor: pointer;
  }

  .nav {
    display: none; /* Hide standard horizontal links */
  }

  /* When JS toggles this class, the menu appears as a dropdown */
  .nav.show {
    display: flex;
    position: absolute;
    top: 100%;
    right: 0;
    background: var(--navbar);
    flex-direction: column;
    padding: 16px;
    width: 200px;
    box-shadow: var(--shadow);
    border: 1px solid rgba(110, 231, 247, 0.1);
  }
}



function initHamburger() {
  const btn = document.querySelector('.hamburger');
  const nav = document.querySelector('.nav');
  if (!btn || !nav) return;

  btn.addEventListener('click', () => {
    nav.classList.toggle('show');
  });
}

function initReveal() {
  const els = document.querySelectorAll('.reveal');
  if (!els.length) return;

  const io = new IntersectionObserver(
    entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('is-visible');
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
