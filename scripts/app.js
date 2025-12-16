/* Combined NovaDev Suite script
   - Meme Maker (client-side)
   - Prompt Library (localStorage)
   - Animations: reveal on scroll, tilt on hover
   - Live footer clock
   - Defensive and self-contained
*/

(() => {
  'use strict';

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const safe = (fn) => { try { fn(); } catch(e) { console.error(e); } };

  /* ===== MEME MAKER ===== */
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

      // Responsive font sizing
      const baseFont = Math.max(28, Math.round(canvas.width / 15)); // smaller on mobile
      ctx.fillStyle = 'white';
      ctx.strokeStyle = 'black';
      ctx.lineWidth = Math.max(6, Math.round(baseFont / 10));
      ctx.textAlign = 'center';
      ctx.font = `${baseFont}px Impact, Arial, sans-serif`;

      const padding = Math.round(baseFont * 0.8);
      const topY = padding + baseFont;            // push text down so it's not clipped
      const bottomY = canvas.height - padding;    // from bottom

      wrapAndDrawText(ctx, top, canvas.width/2, topY, canvas.width - 80, baseFont * 1.1, false);
      wrapAndDrawText(ctx, bottom, canvas.width/2, bottomY, canvas.width - 80, baseFont * 1.1, true);
    }

    if (imageInput) {
      imageInput.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) {
          loadedImage = null;
          drawMemeCanvas();
          return;
        }
        const url = URL.createObjectURL(file);
        const img = new Image();

        // When a blob/object URL is used, crossOrigin is unnecessary and can cause issues in some environments.
        img.onload = () => {
          loadedImage = img;
          drawMemeCanvas();
          // revoke blob URL to free memory
          try { URL.revokeObjectURL(url); } catch (err) { /* ignore */ }
        };
        img.onerror = () => {
          console.warn('Failed to load image for meme');
          loadedImage = null;
          drawMemeCanvas();
          try { URL.revokeObjectURL(url); } catch (err) { /* ignore */ }
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

  }); // end meme safe

  /* ===== PROMPT LIBRARY ===== */
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

        copyBtn.addEventListener('click', async () => {
          try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
              await navigator.clipboard.writeText(p);
            } else {
              // fallback for older browsers / iOS
              const ta = document.createElement('textarea');
              ta.value = p;
              ta.setAttribute('readonly', '');
              ta.style.position = 'absolute';
              ta.style.left = '-9999px';
              document.body.appendChild(ta);
              ta.select();
              document.execCommand('copy');
              ta.remove();
            }
            copyBtn.textContent = 'Copied!';
          } catch (err) {
            console.warn('Clipboard copy failed', err);
            alert('Could not copy to clipboard — please copy manually.');
          }

          // Reset label after short delay
          setTimeout(() => {
            copyBtn.textContent = 'Copy';
          }, 1000);
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

  /* ===== ANIMATIONS & CLOCK ===== */
  safe(() => {
    // Improved reveal-on-scroll: supports .reveal, .fade-scroll, .fade-in, with gentle staggering
    const selector = '.reveal, .fade-scroll, .fade-in';
    const elems = Array.from(document.querySelectorAll(selector));
    if (!('IntersectionObserver' in window) || !elems.length) {
      // fallback: show everything
      elems.forEach(el => {
        el.classList.add('is-visible');
        el.classList.add('visible');
      });
    } else {
      const io = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          const el = entry.target;
          el.classList.add('is-visible'); // for legacy .reveal CSS
          el.classList.add('visible');    // for transition-based .fade-in / .fade-scroll
          obs.unobserve(el);
        });
      }, {
        root: null,
        rootMargin: '0px 0px -12% 0px', // trigger a little before element fully enters
        threshold: 0.08
      });

      elems.forEach((el, i) => {
        if (!el.dataset.delay) el.dataset.delay = String(Math.min(6, Math.floor(i/2)));
        el.style.transitionDelay = `${(parseInt(el.dataset.delay, 10)||0) * 70}ms`;
        io.observe(el);
      });
    }

    // project tilt
    const tiltCards = $$('.card.project');
    tiltCards.forEach(card => {
      card.classList.add('project-tilt');
      if (('ontouchstart' in window) || navigator.maxTouchPoints > 0) return;
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const px = (e.clientX - rect.left) / rect.width;
        const py = (e.clientY - rect.top) / rect.height;
        const rx = (py - 0.5) * 6;
        const ry = (px - 0.5) * -8;
        card.style.transform = `perspective(1000px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-6px)`;
      });
      card.addEventListener('mouseleave', () => { card.style.transform = ''; });
      card.addEventListener('focusin', () => card.style.transform = 'translateY(-8px)');
      card.addEventListener('focusout', () => card.style.transform = '');
    });

    // live clock
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
    } // close updateClock

    updateClock();
    setInterval(updateClock, 1000);

    // hero entrance (keep small immediate reveal on left, staged right)
    const heroLeft = $('.hero-left');
    const heroRight = $('.hero-right');
    if (heroLeft) heroLeft.classList.add('reveal', 'is-visible');
    if (heroRight) {
      heroRight.classList.add('reveal');
      setTimeout(() => heroRight.classList.add('is-visible'), 220);
    }
  });

  // action dispatcher for data-action buttons
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;
    if (action === 'playWheelie') {
      document.getElementById('tools')?.scrollIntoView({behavior:'smooth'});
    } else if (action === 'openProject1') {
      // placeholder for opening modals or navigating
      console.info('openProject1 clicked');
    }
  });
   
/* HERO INTRO — Smooth minimal sequence (plays once per session)
   Usage: window.playHeroIntro(forceReplay = false)
*/
(function(){
  const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const playedKey = 'novadev_hero_intro_played_v1';

  function qs(sel, ctx=document){ return ctx.querySelector(sel); }
  function qsa(sel, ctx=document){ return Array.from(ctx.querySelectorAll(sel)); }

  function addIntroClass(el){
    if (!el) return;
    el.classList.add('hero-intro-item');
    // ensure initial hidden state computed
    el.style.willChange = 'opacity, transform';
  }

  function makeSequence() {
    // Order of appearance, tuned for smooth/minimal feel
    const seq = [];

    // 1. background glow (subtle)
    qsa('.hero-glow .float-dot').forEach(dot => seq.push(dot));

    // 2. hero-left title block: name/title/subject (we'll reveal hero-left children)
    const heroLeft = qs('.hero-left');
    if (heroLeft) {
      // prefer specific elements if available
      const title = qs('.hero-title', heroLeft);
      const sub  = qs('.hero-sub', heroLeft);
      const profile = qs('.hero-profile', heroLeft) || qs('.hero-profile');
      if (title) seq.push(title);
      if (sub) seq.push(sub);
      if (profile) seq.push(profile);
    }

    // 3. CTA buttons
    qsa('.hero-ctas .btn').forEach(btn => seq.push(btn));

    // 4. mockup (visual) then badge
    const mock = qs('.mockup');
    if (mock) seq.push(mock);
    const badge = qs('.mockup-badge');
    if (badge) seq.push(badge);

    return seq.filter(Boolean);
  }

  function showItem(el, delay){
    if (!el) return;
    // ensure it has the base class
    addIntroClass(el);
    // Use rAF to avoid layout thrashing
    window.setTimeout(() => {
      requestAnimationFrame(() => el.classList.add('intro-visible'));
    }, Math.max(0, delay));
  }

  function playHeroIntro(forceReplay = false){
    if (prefersReduced) return; // don't animate if user prefers reduced motion
    try {
      if (!forceReplay && sessionStorage.getItem(playedKey)) return;
      const seq = makeSequence();
      if (!seq.length) {
        // nothing to animate
        sessionStorage.setItem(playedKey, '1');
        return;
      }

      // prepare elements: make them intro items so CSS applies
      seq.forEach(el => addIntroClass(el));

      // timings (ms)
      let t = 80;
      const stagger = 120; // ms between items
      // small extra gaps for visual rhythm
      const gapAfterTitle = 80;

      // start with subtle background glow earlier
      seq.forEach((el, idx) => {
        // logic to create a pleasant rhythm:
        // first two (glow) should be slightly earlier
        const isGlow = el.matches && el.matches('.hero-glow .float-dot, .hero-glow .float-dot');
        const baseDelay = isGlow ? 0 : t;
        showItem(el, baseDelay);
        if (!isGlow) t += stagger;
        // after title reveal add small gap
        if (idx === 1) t += gapAfterTitle;
      });

      // mark played
      sessionStorage.setItem(playedKey, '1');
    } catch (err) {
      console.warn('Hero intro failed', err);
    }
  }

  // Auto run on DOM ready (if hero exists)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      // slight delay to let fonts render
      setTimeout(() => playHeroIntro(false), 220);
    });
  } else {
    setTimeout(() => playHeroIntro(false), 220);
  }

  // Expose for manual replay
  window.playHeroIntro = function(force){
    playHeroIntro(Boolean(force));
  };

})();

  console.info('NovaDev Suite script loaded');
})();

/* ==== Blog Comments System ==== */
(() => {
  const COMMENTS_KEY = 'novadev_blog_comments_v1';

  // Load comments from localStorage
  function loadComments() {
    try {
      return JSON.parse(localStorage.getItem(COMMENTS_KEY) || '{}');
    } catch (e) {
      return {};
    }
  }

  // Save comments to localStorage
  function saveComments(comments) {
    localStorage.setItem(COMMENTS_KEY, JSON.stringify(comments));
  }

  // Render comments for a post
  function renderComments(postId) {
    const comments = loadComments();
    const postComments = comments[postId] || [];
    const container = document.querySelector(`.comments-section[data-post-id="${postId}"] .comments-list`);
    
    if (!container) return;

    if (postComments.length === 0) {
      container.innerHTML = '<p class="muted">No comments yet. Be the first to comment!</p>';
      return;
    }

    container.innerHTML = postComments.map(comment => `
      <div class="comment-item">
        <div class="comment-header">
          <span class="comment-author">${escapeHtml(comment.name)}</span>
          <span class="comment-date">${new Date(comment.date).toLocaleDateString()}</span>
        </div>
        <div class="comment-text">${escapeHtml(comment.text)}</div>
      </div>
    `).join('');

    // Update comment count
    updateCommentCount(postId, postComments.length);
  }

  // Update comment count badge
  function updateCommentCount(postId, count) {
    const badge = document.querySelector(`.toggle-comments[data-post-id="${postId}"] .comment-count`);
    if (badge) {
      badge.textContent = count;
    }
  }

  // Escape HTML to prevent XSS
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Toggle comments section
  document.querySelectorAll('.toggle-comments').forEach(btn => {
    btn.addEventListener('click', () => {
      const postId = btn.dataset.postId;
      const section = document.querySelector(`.comments-section[data-post-id="${postId}"]`);
      if (section) {
        section.classList.toggle('hidden');
        if (!section.classList.contains('hidden')) {
          renderComments(postId);
        }
      }
    });
  });

  // Handle comment form submissions
  document.querySelectorAll('.comment-form').forEach(form => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const postId = form.closest('.comments-section').dataset.postId;
      const name = form.querySelector('[name="name"]').value.trim();
      const text = form.querySelector('[name="comment"]').value.trim();

      if (!name || !text) return;

      // Load existing comments
      const comments = loadComments();
      if (!comments[postId]) {
        comments[postId] = [];
      }

      // Add new comment
      comments[postId].push({
        name,
        text,
        date: new Date().toISOString()
      });

      // Save and render
      saveComments(comments);
      renderComments(postId);

      // Reset form
      form.reset();

      // Show success message
      const btn = form.querySelector('button[type="submit"]');
      const originalText = btn.textContent;
      btn.textContent = 'Comment Posted!';
      btn.disabled = true;
      setTimeout(() => {
        btn.textContent = originalText;
        btn.disabled = false;
      }, 2000);
    });
  });

  // Initialize comment counts on page load
  document.querySelectorAll('.blog-post').forEach(post => {
    const postId = post.dataset.postId;
    const comments = loadComments();
    const count = (comments[postId] || []).length;
    updateCommentCount(postId, count);
  });
})();

/* ==== Contact Forms Enhancement ==== */
(() => {
  // Add success messages to all forms
  const forms = ['sponsorForm', 'contributorForm', 'contactForm'];
  
  forms.forEach(formId => {
    const form = document.getElementById(formId);
    if (!form) return;

    form.addEventListener('submit', (e) => {
      // Netlify will handle the actual submission
      // We just add visual feedback
      const btn = form.querySelector('button[type="submit"]');
      const originalText = btn.textContent;
      
      btn.textContent = 'Sending...';
      btn.disabled = true;

      // Netlify handles the redirect, but we add a timeout fallback
      setTimeout(() => {
        btn.textContent = 'Sent! ✓';
        setTimeout(() => {
          btn.textContent = originalText;
          btn.disabled = false;
        }, 2000);
      }, 1000);
    });
  });
})();

/* ==== In-page Monaco editor + live preview (NovaDevStudio) ==== */
(() => {
  // Config
  const STORAGE_KEY = 'novadev_editor_v1';
  const MONACO_BASE = 'https://unpkg.com/monaco-editor@0.37.1/min/vs';

  // Helpers
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from((ctx || document).querySelectorAll(sel));
  const saveToStorage = (obj) => localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
  const loadFromStorage = () => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
    catch(e){ return {}; }
  };

  // Default starter files
  const DEFAULTS = {
    'index.html': `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>NovaDev Editor Preview</title>
    <link rel="stylesheet" href="styles.css">
  </head>
  <body>
    <main>
      <h1>Hello from NovaDev Editor</h1>
      <div id="app">Edit HTML, CSS, JS and click Run.</div>
    </main>
    <script src="script.js"></script>
  </body>
</html>`,
    'styles.css': `/* styles.css — demo */\nbody{font-family:Inter,system-ui,Arial;background:#071422;color:#e6eef6;padding:24px}\nh1{color:var(--accent-1, #6EE7F7)}`,
    'script.js': `// script.js — demo\nconsole.log('NovaDev Editor running');\ndocument.getElementById('app').innerHTML += '<p>JS executed.</p>';\n`
  };

  // Elements
  const editorContainer = document.getElementById('editorContainer');
  const previewFrame = document.getElementById('editorPreview');
  const runBtn = document.getElementById('editorRun');
  const saveBtn = document.getElementById('editorSave');
  const exportBtn = document.getElementById('editorExport');
  const fileTabs = document.querySelectorAll('.file-tab');

  // State
  let monacoEditor = null;
  let models = {}; // { filename: monaco.editor.ITextModel }
  let currentFile = 'index.html';

  // Load stored or default
  const stored = loadFromStorage();
  const initialFiles = {
    'index.html': stored['index.html'] || DEFAULTS['index.html'],
    'styles.css': stored['styles.css'] || DEFAULTS['styles.css'],
    'script.js': stored['script.js'] || DEFAULTS['script.js']
  };

  // Dynamically load the Monaco loader script
  function loadMonacoLoader() {
    return new Promise((resolve, reject) => {
      if (window.require && window.monaco) return resolve();
      const existing = document.querySelector('script[data-monaco-loader]');
      if (existing) {
        existing.addEventListener('load', () => resolve());
        existing.addEventListener('error', () => reject(new Error('Failed to load monaco loader')));
        return;
      }
      const s = document.createElement('script');
      s.src = MONACO_BASE + '/loader.js';
      s.async = true;
      s.setAttribute('data-monaco-loader', '1');
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('Failed to load monaco loader'));
      document.head.appendChild(s);
    });
  }

  // Initialize Monaco
  async function initMonaco() {
    await loadMonacoLoader();
    // configure require
    if (window.require && !window.require.configuredForNova) {
      window.require.config({ paths: { vs: MONACO_BASE } });
      window.require.configuredForNova = true;
    }

    return new Promise((resolve, reject) => {
      try {
        window.require(['vs/editor/editor.main'], () => {
          // create models for files
          const createModel = (code, lang, filename) => {
            // reuse if existing model for hot reload
            const existing = window.monaco && window.monaco.editor && window.monaco.editor.getModels().find(m => m.uri.path === '/' + filename);
            if (existing) {
              existing.setValue(code);
              return existing;
            }
            return monaco.editor.createModel(code, lang, monaco.Uri.parse('inmemory://model/' + filename));
          };

          models['index.html'] = createModel(initialFiles['index.html'], 'html', 'index.html');
          models['styles.css'] = createModel(initialFiles['styles.css'], 'css', 'styles.css');
          models['script.js'] = createModel(initialFiles['script.js'], 'javascript', 'script.js');

          // Create editor
          monacoEditor = monaco.editor.create(editorContainer, {
            model: models[currentFile],
            glyphMargin: false,
            lightbulb: { enabled: true },
            automaticLayout: true,
            minimap: { enabled: false },
            fontSize: 13,
            lineNumbers: "on",
            theme: 'vs-dark'
          });

          // When switching models via tabs, set model
            document.querySelectorAll('.file-tab').forEach(btn => {
              btn.addEventListener('click', (ev) => {
                const f = btn.dataset.file;
                switchFile(f);
              });
            });

          // keyboard shortcuts
          monacoEditor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_S, () => {
            handleSave();
          });
          monacoEditor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
            handleRun();
          });

          resolve();
        });
      } catch (e) {
        reject(e);
      }
    });
  }

  function switchFile(filename) {
    if (!models[filename]) return;
    currentFile = filename;
    // update active tab UI
    document.querySelectorAll('.file-tab').forEach(b => b.classList.toggle('active', b.dataset.file === filename));
    monacoEditor.setModel(models[filename]);
    monacoEditor.focus();
  }

  function getAllFilesContent() {
    return {
      'index.html': models['index.html'] ? models['index.html'].getValue() : initialFiles['index.html'],
      'styles.css': models['styles.css'] ? models['styles.css'].getValue() : initialFiles['styles.css'],
      'script.js': models['script.js'] ? models['script.js'].getValue() : initialFiles['script.js']
    };
  }

  function buildPreviewHTML(files) {
    // We will inject styles.css content before </head> if present, otherwise inject at top
    let html = files['index.html'];

    // Inject styles.css content before </head> if present, otherwise inject at top
    const styleTag = `<style>\n${files['styles.css']}\n</style>\n`;
    if (/<\/head>/i.test(html)) {
      html = html.replace(/<\/head>/i, styleTag + '</head>');
    } else {
      html = styleTag + html;
    }

    // Inject script.js before </body> if present, otherwise append
    const scriptTag = `<script>\n${files['script.js']}\n<\/script>\n`;
    if (/<\/body>/i.test(html)) {
      html = html.replace(/<\/body>/i, scriptTag + '</body>');
    } else {
      html = html + scriptTag;
    }

    return html;
  }

  function handleRun() {
    const files = getAllFilesContent();
    const previewHTML = buildPreviewHTML(files);
    // Use srcdoc for preview
    try {
      previewFrame.srcdoc = previewHTML;
    } catch (e) {
      // fallback to blob URL if srcdoc not supported
      const blob = new Blob([previewHTML], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      previewFrame.src = url;
      setTimeout(() => URL.revokeObjectURL(url), 20000);
    }
  }

  function handleSave() {
    const files = getAllFilesContent();
    saveToStorage(files);

    // small visual feedback
    if (saveBtn) {
      const original = saveBtn.textContent;
      saveBtn.textContent = 'Saved!';
      saveBtn.disabled = true;
      setTimeout(() => {
        saveBtn.textContent = original;
        saveBtn.disabled = false;
      }, 900);
    }
  }

  function handleExport() {
    const files = getAllFilesContent();
    const html = buildPreviewHTML(files);
    const blob = new Blob([html], { type: 'text/html' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'novadev-editor-export.html';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 15000);
  }

  // Wire up buttons
  runBtn && runBtn.addEventListener('click', handleRun);
  saveBtn && saveBtn.addEventListener('click', handleSave);
  exportBtn && exportBtn.addEventListener('click', handleExport);

  // Initialize
  initMonaco().then(() => {
    // default active tab
    switchFile(currentFile);
    // initial run to show preview
    handleRun();
    console.info('NovaDev Editor initialized');
  }).catch(err => {
    console.error('Failed to initialize Monaco editor:', err);
    // Provide fallback textarea editor if Monaco fails
    if (editorContainer) {
      editorContainer.innerHTML = '<textarea id="fallbackEditor" style="width:100%;height:320px;font-family:monospace;padding:12px;background:#071422;color:#e6eef6;border:0;">' + initialFiles['index.html'] + '</textarea>';
    }
  });

  // Expose basic methods for debugging
  window.novaDevEditor = {
    run: handleRun,
    save: handleSave,
    export: handleExport,
    getFiles: () => getAllFilesContent()
  };

})();
