/* ide.core.js */
(() => {
  'use strict';

  console.log('[ide.core] loaded');

  const STORAGE_KEY = 'novadev_project_v2';
  const state = NovaIDE.state;

  /* ------------------ TAP HELPER (MOBILE-FIRST) ------------------ */
  function onTap(el, handler) {
    if (!el) return;

    el.addEventListener('pointerdown', e => {
      // left-click / primary touch only
      if (e.button !== undefined && e.button !== 0) return;

      e.preventDefault();
      handler(e);
    });
  }

  /* ------------------ DEFAULT STATE ------------------ */

  state.project = {
    name: 'my-project',
    files: {
      'index.html': {
        language: 'html',
        content:
          '<!DOCTYPE html>\n<html>\n<body>\n<h1>Hello NovaDev</h1>\n</body>\n</html>'
      }
    }
  };

  state.tabs = [];
  state.currentTab = null;
  state.editor = null;
  state.problems = [];

  /* ------------------ STORAGE ------------------ */

  function loadStorage() {
    try {
      const p = localStorage.getItem(STORAGE_KEY);
      if (p) state.project = JSON.parse(p);
    } catch (e) {
      console.warn('[NovaIDE] Storage load failed', e);
    }
  }

  function saveProject() {
    if (state.editor && state.currentTab) {
      state.project.files[state.currentTab].content =
        state.editor.getValue();
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.project));
  }

  /* ------------------ COMMANDS ------------------ */

  function toggleLivePreview() {
    const frame = document.getElementById('livePreviewFrame');
    if (!frame || !state.editor) return;

    frame.classList.toggle('hidden');
    if (!frame.classList.contains('hidden')) {
      frame.srcdoc = state.editor.getValue();
    }
  }

  /* ------------------ FILES ------------------ */

  function guessLang(name) {
    const ext = name.split('.').pop();
    return {
      js: 'javascript',
      html: 'html',
      css: 'css',
      json: 'json'
    }[ext] || 'plaintext';
  }

  function createFile(name) {
    if (state.project.files[name]) return;

    state.project.files[name] = {
      language: guessLang(name),
      content: ''
    };

    saveProject();
    openFile(name);
    renderFileTree();
  }

  function openFile(name) {
    const file = state.project.files[name];
    if (!file || !state.editor) return;

    let tab = state.tabs.find(t => t.name === name);

    if (!tab) {
      const model = monaco.editor.createModel(
        file.content,
        file.language
      );
      tab = { name, model };
      state.tabs.push(tab);
    }

    state.currentTab = name;
    state.editor.setModel(tab.model);
    renderTabs();
    renderFileTree();
  }

  function closeFile(name) {
    const idx = state.tabs.findIndex(t => t.name === name);
    if (idx === -1) return;

    state.tabs[idx].model.dispose();
    state.tabs.splice(idx, 1);

    state.currentTab = state.tabs[0]?.name || null;
    state.editor.setModel(
      state.currentTab ? state.tabs[0].model : null
    );

    renderTabs();
    renderFileTree();
  }

  /* ------------------ EXPLORER ------------------ */

  function renderFileTree() {
    const tree = document.getElementById('fileTree');
    if (!tree) return;

    tree.innerHTML = '';

    Object.keys(state.project.files).forEach(name => {
      const item = document.createElement('div');
      item.className = 'file-item';
      if (state.currentTab === name) item.classList.add('active');
      item.textContent = name;

      onTap(item, () => openFile(name));

      tree.appendChild(item);
    });
  }

  /* ------------------ TABS ------------------ */

  function renderTabs() {
    const tabsEl = document.getElementById('editorTabs');
    if (!tabsEl) return;

    tabsEl.innerHTML = '';

    state.tabs.forEach(tab => {
      const el = document.createElement('div');
      el.className = 'editor-tab';
      if (tab.name === state.currentTab) el.classList.add('active');

      el.innerHTML = `
        <span class="tab-name">${tab.name}</span>
        <span class="tab-close">×</span>
      `;

      onTap(el.querySelector('.tab-name'), () =>
        openFile(tab.name)
      );

      onTap(el.querySelector('.tab-close'), e => {
        e.stopPropagation(); // REQUIRED here
        closeFile(tab.name);
      });

      tabsEl.appendChild(el);
    });
  }

  /* ------------------ MONACO ------------------ */

  function initEditor() {
    const el = document.getElementById('editorContainer');
    if (!el) return;

    state.editor = monaco.editor.create(el, {
      theme: 'vs-dark',
      automaticLayout: true,
      minimap: { enabled: false },
      scrollBeyondLastLine: false
    });

    const first = Object.keys(state.project.files)[0];
    if (first) openFile(first);

    state.editor.onDidChangeModelContent(() => {
      saveProject();
      NovaIDE.services?.runBasicChecks?.();
    });
  }

  /* ------------------ UI ------------------ */

  function activateSidebar(view) {
    if (view === 'settings') {
      document.getElementById('settingsPanel')
        ?.classList.remove('hidden');
      return;
    }

    document.querySelectorAll('.sidebar-view')
      .forEach(v => v.classList.remove('active'));

    document.querySelectorAll('.activity-btn')
      .forEach(b => b.classList.remove('active'));

    document.getElementById(view + 'View')
      ?.classList.add('active');

    document.querySelector(`[data-view="${view}"]`)
      ?.classList.add('active');

    document.querySelector('.sidebar')
      ?.classList.add('open');
  }

  function bindUI() {
  console.log('[ide.core] bindUI running');
  ...
}
    document.querySelectorAll('.activity-btn[data-view]')
      .forEach(btn => {
        onTap(btn, () => activateSidebar(btn.dataset.view));
      });

    onTap(
      document.querySelector('.sidebar-toggle'),
      () => document.querySelector('.sidebar')?.classList.toggle('open')
    );

    onTap(
      document.getElementById('newFileBtn'),
      () => {
        const name = prompt('File name');
        if (name) createFile(name);
      }
    );

    onTap(
      document.getElementById('closeSettings'),
      () =>
        document.getElementById('settingsPanel')
          ?.classList.add('hidden')
    );

    onTap(
      document.getElementById('livePreviewToggle'),
      toggleLivePreview
    );
  }

  /* ------------------ PROBLEMS ------------------ */

  function setProblems(list) {
    state.problems = list;
    NovaIDE.panels?.renderProblems?.();
  }

  function clearProblems() {
    state.problems = [];
    NovaIDE.panels?.renderProblems?.();
  }

  /* ------------------ INIT ------------------ */

  NovaIDE.core = {
    init() {
      loadStorage();
      initEditor();
      bindUI();
      renderFileTree();
      console.log('[NovaIDE] Core ready');
    },
    openFile,
    closeFile,
    setProblems,
    clearProblems,
    getProblems: () => state.problems
  };
})();
