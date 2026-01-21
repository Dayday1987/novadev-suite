(() => {
  'use strict';

  /* ================================
     GLOBAL SAFE HELPERS
  ================================= */

  const $ = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));
  const exists = el => el !== null && el !== undefined;

  /* ================================
     CONSTANTS
  ================================= */

  const MONACO_BASE = 'https://unpkg.com/monaco-editor@0.44.0/min/vs';
  const STORAGE_KEY = 'novadev_project';
  const SETTINGS_KEY = 'novadev_settings';
  const PROFILES_KEY = 'novadev_profiles';

  /* ================================
     STATE
  ================================= */

  let editor = null;
  let tabs = [];
  let currentTab = null;
  let livePreview = false;
  let currentProfile = 'default';

  /* ================================
     DATA MODELS
  ================================= */

  let settings = {
    theme: 'vs-dark',
    fontSize: 14,
    tabSize: 2,
    wordWrap: 'off',
    minimap: true,
    lineNumbers: true
  };

  let profiles = {
    default: { name: 'Default', settings: { ...settings } }
  };

  let project = {
    name: 'my-project',
    files: {
      'index.html': {
        language: 'html',
        content:
`<!DOCTYPE html>
<html>
<head>
  <title>NovaDev</title>
</head>
<body>
  <h1>Hello NovaDev</h1>
</body>
</html>`
      },
      'style.css': {
        language: 'css',
        content: 'body { font-family: sans-serif; }'
      },
      'script.js': {
        language: 'javascript',
        content: 'console.log("NovaDev IDE ready");'
      }
    }
  };

  /* ================================
     STORAGE
  ================================= */

  function loadAll() {
    try {
      const s = localStorage.getItem(SETTINGS_KEY);
      const p = localStorage.getItem(STORAGE_KEY);
      const pr = localStorage.getItem(PROFILES_KEY);
      if (s) settings = JSON.parse(s);
      if (p) project = JSON.parse(p);
      if (pr) profiles = JSON.parse(pr);
    } catch {}
  }

  function saveAll() {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
    localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
  }

  /* ================================
     MONACO INIT (CRITICAL FIX)
  ================================= */

  function initMonaco() {
    if (!window.require) {
      console.error('Monaco loader missing');
      return;
    }

    require.config({ paths: { vs: MONACO_BASE } });

    require(['vs/editor/editor.main'], () => {
      editor = monaco.editor.create($('#editorContainer'), {
        theme: settings.theme,
        automaticLayout: true,
        fontSize: settings.fontSize,
        tabSize: settings.tabSize,
        wordWrap: settings.wordWrap,
        minimap: { enabled: settings.minimap },
        lineNumbers: settings.lineNumbers ? 'on' : 'off'
      });

      openFile(Object.keys(project.files)[0]);

      editor.onDidChangeModelContent(() => {
        if (!currentTab) return;
        project.files[currentTab.name].content = editor.getValue();
        saveAll();
        if (livePreview) updatePreview();
      });
    });
  }

  /* ================================
     FILES + TABS
  ================================= */

  function openFile(name) {
    if (!project.files[name] || !editor) return;

    let tab = tabs.find(t => t.name === name);
    if (!tab) {
      const model = monaco.editor.createModel(
        project.files[name].content,
        project.files[name].language
      );
      tab = { name, model };
      tabs.push(tab);
    }

    currentTab = tab;
    editor.setModel(tab.model);
    renderTabs();
    renderFileTree();
  }

  function closeTab(name) {
    const idx = tabs.findIndex(t => t.name === name);
    if (idx === -1) return;
    tabs[idx].model.dispose();
    tabs.splice(idx, 1);
    currentTab = tabs[0] || null;
    editor.setModel(currentTab ? currentTab.model : null);
    renderTabs();
  }

  function renderTabs() {
    const bar = $('#editorTabs');
    if (!exists(bar)) return;
    bar.innerHTML = '';
    tabs.forEach(t => {
      const el = document.createElement('div');
      el.className = 'editor-tab' + (t === currentTab ? ' active' : '');
      el.innerHTML = `<span>${t.name}</span><button>×</button>`;
      el.onclick = () => openFile(t.name);
      el.querySelector('button').onclick = e => {
        e.stopPropagation();
        closeTab(t.name);
      };
      bar.appendChild(el);
    });
  }

  function renderFileTree() {
    const tree = $('#fileTree');
    if (!exists(tree)) return;
    tree.innerHTML = '';
    Object.keys(project.files).forEach(f => {
      const el = document.createElement('div');
      el.className = 'file-item';
      el.textContent = f;
      el.onclick = () => openFile(f);
      tree.appendChild(el);
    });
  }

  /* ================================
     LIVE PREVIEW
  ================================= */

  function updatePreview() {
    const frame = $('#livePreviewFrame');
    if (!exists(frame)) return;

    const html = project.files['index.html']?.content || '';
    const css = project.files['style.css']?.content || '';
    const js = project.files['script.js']?.content || '';

    frame.srcdoc =
      html.replace('</head>', `<style>${css}</style></head>`)
          .replace('</body>', `<script>${js}<\/script></body>`);
  }

  /* ================================
     TERMINAL (SAFE)
  ================================= */

  function addTerminal(text) {
    const out = $('#terminalOutput');
    if (!exists(out)) return;
    const div = document.createElement('div');
    div.textContent = text;
    out.appendChild(div);
    out.scrollTop = out.scrollHeight;
  }

  /* ================================
     COMMAND PALETTE
  ================================= */

  function setupCommandPalette() {
    const palette = $('#commandPalette');
    const input = $('#commandInput');
    if (!exists(palette) || !exists(input)) return;

    document.addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        palette.classList.remove('hidden');
        input.focus();
      }
      if (e.key === 'Escape') palette.classList.add('hidden');
    });
  }

  /* ================================
     SIDEBAR TOGGLE
  ================================= */

  function setupSidebarToggle() {
    const btn = $('.sidebar-toggle');
    if (!exists(btn)) return;
    btn.onclick = () => $('.sidebar')?.classList.toggle('open');
  }

  /* ================================
     INIT
  ================================= */

  function init() {
    loadAll();
    setupSidebarToggle();
    setupCommandPalette();
    initMonaco();
    renderFileTree();
    addTerminal('NovaDev IDE ready');
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', init)
    : init();
})();
