/* NovaDev Suite — script.js
   Meme maker + Prompt Library (localStorage)
*/

(() => {
  /* ===== THEME / FUTURE HOOKS ===== */
  // placeholder for theme toggle or analytics later

  /* ===== MEME MAKER ===== */
  const canvas = document.getElementById('memeCanvas');
  const ctx = canvas.getContext('2d');
  const imageInput = document.getElementById('imageInput');
  const topTextInput = document.getElementById('topText');
  const bottomTextInput = document.getElementById('bottomText');
  const drawBtn = document.getElementById('drawMeme');
  const downloadBtn = document.getElementById('downloadMeme');
  const resetBtn = document.getElementById('resetMeme');

  // default canvas size
  const CANVAS_W = 1000;
  const CANVAS_H = 600;

  // start with a dark background
  function initCanvasSize() {
    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;
  }
  initCanvasSize();

  let loadedImage = null;

  imageInput.addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.crossOrigin = "anonymous"; // helpful if using external images later
    img.onload = () => {
      loadedImage = img;
      drawMemeCanvas();
    };
    img.src = url;
  });

  function drawBase() {
    ctx.clearRect(0,0,canvas.width,canvas.height);
    if (loadedImage) {
      // cover-style scaling
      const scale = Math.max(canvas.width / loadedImage.width, canvas.height / loadedImage.height);
      const w = loadedImage.width * scale;
      const h = loadedImage.height * scale;
      const x = (canvas.width - w) / 2;
      const y = (canvas.height - h) / 2;
      ctx.drawImage(loadedImage, x, y, w, h);
    } else {
      // empty background
      ctx.fillStyle = '#071422';
      ctx.fillRect(0,0,canvas.width,canvas.height);
    }
  }

  function drawText() {
    const top = (topTextInput.value || '').toUpperCase();
    const bottom = (bottomTextInput.value || '').toUpperCase();

    ctx.fillStyle = 'white';
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 8;
    ctx.textAlign = 'center';

    let fontSize = 64;
    ctx.font = `${fontSize}px Impact, Arial, sans-serif`;

    // helper: wrap text
    function wrapText(text, x, y, maxWidth, lineHeight, fromBottom=false) {
      if (!text) return;
      const words = text.split(' ');
      let line = '';
      const lines = [];
      for (let n=0;n<words.length;n++){
        const test = (line + words[n] + ' ').trim();
        if (ctx.measureText(test).width > maxWidth && line) {
          lines.push(line.trim());
          line = words[n] + ' ';
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

    // draw top
    wrapText(top, canvas.width/2, 20, canvas.width - 80, 72, false);

    // draw bottom
    wrapText(bottom, canvas.width/2, canvas.height - 20, canvas.width - 80, 72, true);
  }

  function drawMemeCanvas() {
    drawBase();
    drawText();
  }

  drawBtn.addEventListener('click', drawMemeCanvas);

  downloadBtn.addEventListener('click', () => {
    const data = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = data;
    a.download = 'novadev-meme.png';
    a.click();
  });

  resetBtn.addEventListener('click', () => {
    loadedImage = null;
    imageInput.value = '';
    topTextInput.value = '';
    bottomTextInput.value = '';
    drawMemeCanvas();
  });

  // initial render
  drawMemeCanvas();

  /* ===== PROMPT LIBRARY (localStorage simple) ===== */
  const promptInput = document.getElementById('promptInput');
  const savePromptBtn = document.getElementById('savePrompt');
  const clearPromptsBtn = document.getElementById('clearPrompts');
  const promptList = document.getElementById('promptList');
  const STORAGE_KEY = 'novadev_prompts_v1';

  function loadPrompts() {
    const arr = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    renderPrompts(arr);
  }

  function savePrompt() {
    const text = (promptInput.value || '').trim();
    if (!text) return alert('Write a prompt first.');
    const arr = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    arr.unshift(text);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(arr.slice(0,200)));
    promptInput.value = '';
    loadPrompts();
  }

  function clearPrompts() {
    if (!confirm('Clear all saved prompts?')) return;
    localStorage.removeItem(STORAGE_KEY);
    loadPrompts();
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

  savePromptBtn.addEventListener('click', savePrompt);
  clearPromptsBtn.addEventListener('click', clearPrompts);

  // initial
  loadPrompts();

})();
