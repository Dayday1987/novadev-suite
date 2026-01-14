export function initUI() {
  console.log('🎨 UI init starting...');
  initHamburger();
  initReveal();
  initClock();
  console.log('🎨 UI init complete');
}

function initHamburger() {
  try {
    const btn = document.querySelector('.hamburger');
    const nav = document.querySelector('.nav');
    
    if (!btn || !nav) {
      console.log('ℹ️ Hamburger elements not found');
      return;
    }
    
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      nav.classList.toggle('show');
      console.log('🍔 Menu toggled:', nav.classList.contains('show'));
    });
    
    // Close menu when clicking nav links
    nav.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        nav.classList.remove('show');
      });
    });
    
    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
      if (!nav.contains(e.target) && !btn.contains(e.target)) {
        nav.classList.remove('show');
      }
    });
    
    console.log('✅ Hamburger menu initialized');
  } catch (error) {
    console.error('❌ Hamburger init failed:', error);
  }
}

function initReveal() {
  try {
    const els = document.querySelectorAll('.reveal');
    if (!els.length) {
      console.log('ℹ️ No reveal elements found');
      return;
    }
    
    // Fallback: make everything visible immediately
    els.forEach(el => {
      el.classList.add('is-visible');
      el.style.opacity = '1';
      el.style.transform = 'none';
    });
    
    // Then setup observer for future scrolling
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
    console.log(`✅ Reveal initialized for ${els.length} elements`);
  } catch (error) {
    console.error('❌ Reveal init failed:', error);
  }
}

function initClock() {
  try {
    const clock = document.getElementById('liveClock');
    if (!clock) {
      console.log('ℹ️ Clock element not found');
      return;
    }
    
    const update = () => {
      clock.textContent = new Date().toLocaleTimeString();
    };
    
    update();
    setInterval(update, 1000);
    
    const year = document.getElementById('year');
    if (year) {
      year.textContent = new Date().getFullYear();
    }
    
    console.log('✅ Clock initialized');
  } catch (error) {
    console.error('❌ Clock init failed:', error);
  }
}
