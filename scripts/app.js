/* Combined NovaDevSuite script
   - Meme Maker (client-side)
   - Prompt Library (localStorage)
   - Animations: reveal on scroll, tilt on hover
   - Live footer clock
   - Safe, defensive: checks for elements
*/

/* Wrap everything to avoid leaking globals */
(() => {
  'use strict';

  /* ---------------------------
     Helper utilities
  ---------------------------*/
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const safe = (fn) => { try { fn(); } catch(e) { console.error(e); } };

  /* ---------------------------
     MEME MAKER
     IDs expected:
     - memeCanvas
     - imageInput
     - topText
     - bottomText
     - drawMeme
     - downloadMeme
     - resetMeme (optional)
  ---------------------------*/
  safe(() => {
    const canvas = $('#memeCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const imageInput = $('#imageInput');
    const topTextInput = $('#topText');
    const bottomTextInput = $('#bottomText');
    const drawBtn = $('#drawMeme');
    const downloadBtn = $('#downloadMeme');
    const resetBtn = $('#resetMeme');

    const CANVAS_W = 1000;
    const CANVAS_H = 600;
    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;

    let loadedImage = null;

    function drawBase() {
      ctx.clearRect(0,0,canvas.width,canvas.height);
      if (loadedImage) {
        const scale = Math.max(canvas.width / loadedImage.width, canvas.height / loadedImage.height);
        const w = loadedImage.width * scale;
        const h = loadedImage.height * scale;
        const x = (canvas.width - w) / 2;
        const y = (canvas.height - h) / 2;
        ctx.drawImage(loadedImage, x, y, w, h);
      } else {
        ctx.fillStyle = '#071422';
        ctx.fillRect(0,0,canvas.width,canvas.height);
      }
    }

    function wrapAndDrawText(ctx, text, x, y, maxWidth, lineHeight, fromBottom=false) {
      if (!text) return;
      const words = text.split(' ');
      let line = '';
      const lines = [];
      for (let i=0;i<words.length;i++){
        const test = (line + words[i] + ' ').trim();
        if (ctx.measureText(test).width > maxWidth && line) {
          lines.push(line.trim());
          line = words[i] + ' ';
        } else {
          line = test + ' ';
        }
      }
      if (line) lines.push(line.trim());
      if (fromBottom) {
        for (let i=0;i<lines.length;i++){
          const t = lines[lines.length-1-i];
          ctx.strokeText(t, x, y - (i*lineHeight));
          ctx.fillText(t, x, y - (i*lineHeight));
        }
      } else {
        for (let i=0;i<lines.length;i++){
          const t = lines[i];
          ctx.strokeText(t, x, y + (i*lineHeight));
          ctx.fillText(t, x, y + (i*lineHeight));
        }
      }
    }

    function drawMemeCanvas() {
      drawBase();
      const top = (topTextInput && topTextInput.value || '').toUpperCase();
      const bottom = (bottomTextInput && bottomTextInput.value || '').toUpperCase();
      ctx.fillStyle = 'white';
      ctx.strokeStyle = 'black';
      ctx.lineWidth = 8;
      ctx.textAlign = 'center';
      const fontSize = 64;
      ctx.font = `${fontSize}px Impact, Arial, sans-serif`;
      wrapAndDrawText(ctx, top, canvas.width/2, 20, canvas.width - 80, 72, false);
      wrapAndDrawText(ctx, bottom, canvas.width/2, canvas.height - 20, canvas.width - 80, 72, true);
    }

    if (imageInput) {
      imageInput.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          loadedImage = img;
          drawMemeCanvas();
        };
        img.src = url;
      });
    }

    if (drawBtn) drawBtn.addEventListener('click', drawMemeCanvas);
    if (downloadBtn) downloadBtn.addEventListener('click', () => {
      const data = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = data;
      a.download = 'novadev-meme.png';
      a.click();
    });
    if (resetBtn) resetBtn.addEventListener('click', () => {
      loadedImage = null;
      if (imageInput) imageInput.value = '';
      if (topTextInput) topTextInput.value = '';
      if (bottomTextInput) bottomTextInput.value = '';
      drawMemeCanvas();
    });

    // draw initial empty canvas
    drawMemeCanvas();
  });

  /* ---------------------------
     PROMPT LIBRARY (localStorage)
     IDs:
      - promptInput
      - savePrompt
      - clearPrompts
      - promptList
  ---------------------------*/
  safe(() => {
    const promptInput = $('#promptInput');
    const savePromptBtn = $('#savePrompt');
    const clearPromptsBtn = $('#clearPrompts');
    const promptList = $('#promptList');
    const STORAGE_KEY = 'novadev_prompts_v1';

    if (!promptList) return;

    function loadPrompts() {
      const arr = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      renderPrompts(arr);
    }

    function renderPrompts(arr) {
      promptList.innerHTML = '';
      if (!arr || arr.length === 0) {
        promptList.innerHTML = '<li class="muted">No prompts saved yet — write one and click Save.</li>';
        return;
      }
      arr.forEach((p, i) => {
        const li = document.createElement('li');
        li.className = 'prompt-item';
        const left = document.createElement('div');
        left.textContent = p;
        left.style.flex = '1';
        left.style.fontSize = '14px';
        left.style.marginRight = '8px';

        const right = document.createElement('div');
        right.style.display = 'flex';
        right.style.gap = '6px';

        const copyBtn = document.createElement('button');
        copyBtn.textContent = 'Copy';
        copyBtn.className = 'btn';
        copyBtn.style.padding = '6px 8px';
        copyBtn.addEventListener('click', () => {
          navigator.clipboard.writeText(p);
          copyBtn.textContent = 'Copied!';
          setTimeout(()=> copyBtn.textContent = 'Copy', 1000);
        });

        const delBtn = document.createElement('button');
        delBtn.textContent = 'Del';
        delBtn.className = 'btn ghost';
        delBtn.style.padding = '6px 8px';
        delBtn.addEventListener('click', () => {
          if (!confirm('Delete this prompt?')) return;
          const arr = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
          arr.splice(i,1);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
          loadPrompts();
        });

        right.appendChild(copyBtn);
        right.appendChild(delBtn);

        li.appendChild(left);
        li.appendChild(right);
        promptList.appendChild(li);
      });
    }

    function savePrompt() {
      const text = (promptInput && promptInput.value || '').trim();
      if (!text) return alert('Write a prompt first.');
      const arr = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      arr.unshift(text);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(arr.slice(0,200)));
      if (promptInput) promptInput.value = '';
      loadPrompts();
    }

    function clearPrompts() {
      if (!confirm('Clear all saved prompts?')) return;
      localStorage.removeItem(STORAGE_KEY);
      loadPrompts();
    }

    if (savePromptBtn) savePromptBtn.addEventListener('click', savePrompt);
    if (clearPromptsBtn) clearPromptsBtn.addEventListener('click', clearPrompts);

    loadPrompts();
  });

  /* ---------------------------
     Animations, reveal-on-scroll, tilt, live clock
  ---------------------------*/
  safe(() => {
    // Reveal on scroll
    const revealElems = $$('.reveal');
    if ('IntersectionObserver' in window && revealElems.length) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            io.unobserve(entry.target);
          }
        });
      }, { root: null, rootMargin: '0px 0px -6% 0px', threshold: 0.12 });

      revealElems.forEach((el, i) => {
        if (!el.dataset.delay) el.dataset.delay = String(Math.min(3, Math.floor(i/2)));
        el.style.transitionDelay = `${(parseInt(el.dataset.delay, 10)||0) * 70}ms`;
        io.observe(el);
      });
    } else {
      revealElems.forEach(el => el.classList.add('is-visible'));
    }

    // Project tile tilt
    const tiltCards = $$('.card.project');
    tiltCards.forEach(card => {
      card.classList.add('project-tilt');
      // ignore tilt for touch devices
      if (('ontouchstart' in window) || navigator.maxTouchPoints > 0) {
        // no tilt on touch devices
        return;
      }
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const px = (e.clientX - rect.left) / rect.width;
        const py = (e.clientY - rect.top) / rect.height;
        const rx = (py - 0.5) * 6; // rotateX
        const ry = (px - 0.5) * -8; // rotateY
        card.style.transform = `perspective(1000px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-6px)`;
      });
      card.addEventListener('mouseleave', () => {
        card.style.transform = '';
      });
      card.addEventListener('focusin', () => card.style.transform = 'translateY(-8px)');
      card.addEventListener('focusout', () => card.style.transform = '');
    });

    // Live footer clock and year
    const clockEl = $('#liveClock');
    const yearEl = $('#year');
    function pad(n){ return n<10 ? '0'+n : n; }
    function updateClock() {
      const now = new Date();
      if (yearEl) yearEl.textContent = now.getFullYear();
      if (!clockEl) return;
      const time = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
      const date = now.toLocaleDateString();
      clockEl.textContent = `${date} · ${time}`;
    }
    updateClock();
    setInterval(updateClock, 1000);

    // Hero entrance
    const heroLeft = $('.hero-left');
    const heroRight = $('.hero-right');
    if (heroLeft) heroLeft.classList.add('reveal', 'is-visible');
    if (heroRight) {
      heroRight.classList.add('reveal');
      setTimeout(() => heroRight.classList.add('is-visible'), 220);
    }
  });

  /* ---------------------------
     Final safety log
  ---------------------------*/
  console.info('NovaDev Suite script loaded');
})();
