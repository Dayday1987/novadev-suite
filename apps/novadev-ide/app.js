(() => {
  'use strict';

  const MONACO_BASE = 'https://unpkg.com/monaco-editor@0.44.0/min/vs';
  const STORAGE_KEY = 'novadev_ide_project_v1';
  const SETTINGS_KEY = 'novadev_ide_settings_v1';

  let editor = null;
  let tabs = [];
  let currentTab = null;
  let livePreview = false;

  let settings = {
    theme: 'vs-dark',
    fontSize: 14,
    tabSize: 2,
    wordWrap: 'off',
    minimap: true,
    lineNumbers: true
  };

  let project = {
    name: 'my-project',
    files: {
      'index.html': {
        content: '<!DOCTYPE html>\n<html>\n<head></head>\n<body></body>\n</html>',
        language: 'html'
      },
      'style.css': {
        content: 'body { margin:0; }',
        language: 'css'
      },
      'script.js': {
        content: 'console.log("NovaDev IDE");',
        language: 'javascript'
      }
    }
  };

  const $ = s => document.querySelector(s);
  const $$ = s => document.querySelectorAll(s);

  function init() {
    loadSettings();
    loadProject();
    setupActivityBar();
    setupSidebar();
    setupCommandPalette();
    setupSettings();
    setupTerminal();
    setupPanelTabs();
    setupSidebarToggle();
    initMonaco();
  }

  /* ---------- Storage ---------- */

  function loadSettings() {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (saved) settings = { ...settings, ...JSON.parse(saved) };
  }

  function saveSettings() {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }

  function loadProject() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) project = JSON.parse(saved);
  }

  function saveProject() {
    if (editor && currentTab) {
      project.files[currentTab.name].content = editor.getValue();
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
  }

  /* ---------- Sidebar ---------- */

  function setupSidebarToggle() {
    $('.sidebar-toggle')?.addEventListener('click', () => {
      $('.sidebar').classList.toggle('open');
    });
  }

  function setupSidebar() {
    $('#newFileBtn').addEventListener('click', () => {
      const name = prompt('File name:');
      if (!name) return;

      if (project.files[name]) {
        alert('File already exists');
        return;
      }

      project.files[name] = {
        content: '',
        language: getLang(name)
      };

      saveProject();
      renderFileTree();
      openFile(name);
    });

    $('#projectNameInput').addEventListener('change', e => {
      project.name = e.target.value;
      saveProject();
    });
  }

  function renderFileTree() {
    const tree = $('#fileTree');
    tree.innerHTML = '';

    Object.keys(project.files).sort().forEach(name => {
      const item = document.createElement('div');
      item.className = 'file-item';
      if (currentTab?.name === name) item.classList.add('active');

      item.textContent = name;
      item.addEventListener('click', () => openFile(name));
      tree.appendChild(item);
    });
  }

  function getLang(name) {
    const ext = name.split('.').pop();
    return { html: 'html', css: 'css', js: 'javascript' }[ext] || 'plaintext';
  }

  /* ---------- Tabs ---------- */

  function renderTabs() {
    const container = $('#editorTabs');
    container.innerHTML = '';

    tabs.forEach(tab => {
      const el = document.createElement('div');
      el.className = 'editor-tab';
      if (currentTab === tab) el.classList.add('active');
      el.textContent = tab.name;
      el.onclick = () => openTab(tab.name);
      container.appendChild(el);
    });
  }

  function openFile(name) {
    if (!project.files[name]) return;

    let tab = tabs.find(t => t.name === name);
    if (!tab) {
      const model = monaco.editor.createModel(
        project.files[name].content,
        project.files[name].language
      );
      tab = { name, model };
      tabs.push(tab);
    }

    openTab(name);
    renderTabs();
  }

  function openTab(name) {
    const tab = tabs.find(t => t.name === name);
    if (!tab || !editor) return;

    currentTab = tab;
    editor.setModel(tab.model);
    updateStatusBar();
    if (livePreview) updatePreview();
  }

  /* ---------- Monaco ---------- */

  function initMonaco() {
    require.config({ paths: { vs: MONACO_BASE } });
    require(['vs/editor/editor.main'], () => {
      const firstFile = Object.keys(project.files)[0];
      openFile(firstFile);

      editor = monaco.editor.create($('#editorContainer'), {
        theme: settings.theme,
        automaticLayout: true,
        fontSize: settings.fontSize,
        tabSize: settings.tabSize,
        wordWrap: settings.wordWrap,
        minimap: { enabled: settings.minimap },
        lineNumbers: settings.lineNumbers ? 'on' : 'off'
      });

      editor.onDidChangeModelContent(() => {
        if (!editor || !currentTab) return;
        saveProject();
        updateStatusBar();
        if (livePreview) updatePreview();
      });

      updateStatusBar();
    });
  }

  /* ---------- Status ---------- */

  function updateStatusBar() {
    if (!editor || !currentTab) return;
    const pos = editor.getPosition();
    $('#cursorPosition').textContent = `Ln ${pos.lineNumber}, Col ${pos.column}`;
    $('#fileLanguage').textContent =
      project.files[currentTab.name].language.toUpperCase();
  }

  /* ---------- Live Preview ---------- */

  function updatePreview() {
    const frame = $('#livePreviewFrame');
    if (!frame) return;

    const html = project.files['index.html']?.content || '';
    const css = project.files['style.css']?.content || '';
    const js = project.files['script.js']?.content || '';

    frame.srcdoc = html
      .replace('</head>', `<style>${css}</style></head>`)
      .replace('</body>', `<script>${js}</script></body>`);
  }

  $('#livePreviewToggle')?.addEventListener('click', () => {
    if (!currentTab || !currentTab.name.endsWith('.html')) {
      addTerminalLine('Live Preview: Open an HTML file');
      return;
    }

    livePreview = !livePreview;
    $('#livePreviewFrame').classList.toggle('hidden', !livePreview);
    if (livePreview) updatePreview();
  });

  /* ---------- Terminal ---------- */

  function setupTerminal() {
    addTerminalLine('NovaDev IDE Terminal');
  }

  function addTerminalLine(text) {
    const out = $('#terminalOutput');
    const div = document.createElement('div');
    div.textContent = text;
    out.appendChild(div);
    out.scrollTop = out.scrollHeight;
  }

  /* ---------- Command Palette ---------- */

  function setupCommandPalette() {}

  /* ---------- Panels ---------- */

  function setupPanelTabs() {}

  /* ---------- Settings ---------- */

  function setupSettings() {}

  /* ---------- Activity Bar ---------- */

  function setupActivityBar() {
    $$('.activity-btn').forEach(btn => {
      btn.onclick = () => {
        const view = btn.dataset.view;
        $$('.sidebar-view').forEach(v => v.classList.add('hidden'));
        $(`#${view}View`)?.classList.remove('hidden');
      };
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
