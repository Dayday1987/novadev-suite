/* ide.core.js */
(() => {
  'use strict';

  const STORAGE_KEY = 'novadev_project_v2';

  const state = NovaIDE.state;

  /* ------------------ DEFAULT STATE ------------------ */

  state.project = {
    name: 'my-project',
    files: {
      'index.html': {
        language: 'html',
        content: '<!DOCTYPE html>\n<html>\n<body>\n<h1>Hello NovaDev</h1>\n</body>\n</html>'
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

  const commands = [
  {
    id: 'file.new',
    label: 'New File',
    run: () => {
      const name = prompt('File name');
      if (name) createFile(name);
    }
  },
  {
    id: 'file.save',
    label: 'Save File',
    run: saveProject
  },
  {
    id: 'view.explorer',
    label: 'Show Explorer',
    run: () => activateSidebar('explorer')
  },
  {
    id: 'view.search',
    label: 'Show Search',
    run: () => activateSidebar('search')
  },
  {
    id: 'view.settings',
    label: 'Open Settings',
    run: () => {
      document.getElementById('settingsPanel')
        ?.classList.remove('hidden');
    }
  },
  {
    id: 'editor.togglePreview',
    label: 'Toggle Live Preview',
    run: () => {
      document.getElementById('livePreviewToggle')?.click();
    }
  }
];

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
    if (!file) return;

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
  }

  function closeFile(name) {
    const idx = state.tabs.findIndex(t => t.name === name);
    if (idx === -1) return;

    state.tabs[idx].model.dispose();
    state.tabs.splice(idx, 1);

    if (state.currentTab === name) {
      state.currentTab = state.tabs[0]?.name || null;
      state.editor.setModel(
        state.currentTab
          ? state.tabs[0].model
          : null
      );
    }

    renderTabs();
  }

  /* ------------------ RENDER: EXPLORER ------------------ */
function renderFileTree() {
  const tree = document.getElementById('fileTree');
  if (!tree) return;

  tree.innerHTML = '';

  Object.keys(state.project.files).forEach(name => {
    const item = document.createElement('div');
    item.className = 'file-item';

    if (state.currentTab === name) {
      item.classList.add('active');
    }

    item.textContent = name;

    item.addEventListener('click', () => {
      openFile(name);
      renderFileTree();

      // Mobile Safari repaint fix
      tree.style.display = 'none';
      tree.offsetHeight;
      tree.style.display = '';
    });

    tree.appendChild(item);
  });
}
  

  /* ------------------ RENDER: TABS ------------------ */

  function renderTabs() {
    const tabsEl = document.getElementById('editorTabs');
    if (!tabsEl) return;

    tabsEl.innerHTML = '';

    state.tabs.forEach(tab => {
      const el = document.createElement('div');
      el.className = 'editor-tab';
      if (tab.name === state.currentTab) {
        el.classList.add('active');
      }

      el.innerHTML = `
        <span class="tab-name">${tab.name}</span>
        <span class="tab-close">×</span>
      `;

      el.querySelector('.tab-name').onclick = () =>
        openFile(tab.name);

      el.querySelector('.tab-close').onclick = e => {
        e.stopPropagation();
        closeFile(tab.name);
      };

      tabsEl.appendChild(el);
    });
  }

  /* ------------------ MONACO ------------------ */

  function initEditor() {
    const el = document.getElementById('editorContainer');
    if (!el) return;

    state.editor = monaco.editor.create(el, {
      theme: 'vs-dark',
      automaticLayout: true
    });

    const first = Object.keys(state.project.files)[0];
    if (first) openFile(first);

    state.editor.onDidChangeModelContent(() => {
  saveProject();
  NovaIDE.services.runBasicChecks();
});
  }

  /* ------------------ UI BINDINGS ------------------ */
function bindUI() {
  console.log('[NovaIDE] UI binding started');

  /* ---------- Panel Tabs ---------- */
document.querySelectorAll('.panel-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    const panel = tab.dataset.panel;

    document.querySelectorAll('.panel-tab')
      .forEach(t => t.classList.remove('active'));
    tab.classList.add('active');

    document.querySelectorAll('.panel-view')
      .forEach(v => v.classList.remove('active'));

    document.getElementById(panel + 'Panel')
      ?.classList.add('active');
  });
});

  /* ---------- Activity Bar ---------- */
document.querySelectorAll('.activity-btn[data-view]').forEach(btn => {
  btn.addEventListener('click', () => {
    console.log('[ACTIVITY CLICK]', btn.dataset.view);
    const view = btn.dataset.view;

    document.querySelectorAll('.activity-btn')
      .forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    document.querySelectorAll('.sidebar-view')
      .forEach(v => v.classList.remove('active'));

    document.getElementById(view + 'View')
      ?.classList.add('active');

    // ✅ THIS IS THE MISSING LINE
    document.querySelector('.sidebar')
      ?.classList.add('open');
  });
});
  
  /* ---------- Sidebar Toggle ---------- */
  document.querySelector('.sidebar-toggle')
    ?.addEventListener('click', () => {
      document.querySelector('.sidebar')
        ?.classList.toggle('open');
    });

  function activateSidebar(view) {
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

  /* ---------- New File ---------- */
  document.getElementById('newFileBtn')
    ?.addEventListener('click', () => {
      const name = prompt('File name');
      if (name) createFile(name);
    });

  /* ---------- Settings ---------- */
  document.querySelectorAll('.activity-btn[data-view]').forEach(btn => {
  btn.addEventListener('click', () => {
    const view = btn.dataset.view;

    // 👇 Settings is NOT a sidebar view
    if (view === 'settings') return;

    activateSidebar(view);
  });
});

  document.getElementById('closeSettings')
    ?.addEventListener('click', () => {
      document.getElementById('settingsPanel')
        ?.classList.add('hidden');
    });

  /* ---------- Live Preview ---------- */
  document.getElementById('livePreviewToggle')
    ?.addEventListener('click', () => {
      const frame = document.getElementById('livePreviewFrame');
      frame.classList.toggle('hidden');
      if (!frame.classList.contains('hidden') && state.editor) {
        frame.srcdoc = state.editor.getValue();
      }
    });

  /* ---------- Terminal ---------- */
  const terminalInput = document.getElementById('terminalInput');
  terminalInput?.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const cmd = terminalInput.value.trim();
      terminalInput.value = '';
      addTerminalLine(`$ ${cmd}`);
    }
  });

  console.log('[NovaIDE] UI binding complete');
}

  function setProblems(list) {
  state.problems = list;
  NovaIDE.panels?.renderProblems?.();
}

function clearProblems() {
  state.problems = [];
  NovaIDE.panels?.renderProblems?.();
}
  
  /* ------------------ INIT ------------------ */
  
  function initCommandPalette() {
  const palette = document.getElementById('commandPalette');
  const input = document.getElementById('commandInput');
  const results = document.getElementById('commandResults');

  if (!palette || !input || !results) return;

  function openPalette() {
    palette.classList.remove('hidden');
    input.value = '';
    input.focus();
    render('');
  }

  function closePalette() {
    palette.classList.add('hidden');
  }

  function render(query) {
    results.innerHTML = '';

    const filtered = commands.filter(c =>
      c.label.toLowerCase().includes(query.toLowerCase())
    );

    filtered.forEach(cmd => {
      const item = document.createElement('div');
      item.className = 'command-item';
      item.textContent = cmd.label;

      item.addEventListener('click', () => {
        closePalette();
        cmd.run();
      });

      results.appendChild(item);
    });
  }

  input.addEventListener('input', e => {
    render(e.target.value);
  });

  input.addEventListener('keydown', e => {
    if (e.key === 'Escape') closePalette();
    if (e.key === 'Enter') {
      const first = results.firstChild;
      first?.click();
    }
  });

  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
      e.preventDefault();
      openPalette();
    }
  });

  // Mobile-friendly open (long press or future button)
  document.addEventListener('dblclick', e => {
    if (e.target.closest('.editor-container')) {
      openPalette();
    }
  });
}
  
    NovaIDE.core = {
    init() {
      loadStorage();
      initEditor();

      // Delay UI binding until DOM + Monaco are stable
      requestAnimationFrame(() => {
        bindUI();
        renderFileTree();
        console.log('[NovaIDE] UI fully bound');
      });
    },

    setProblems,
    clearProblems,
    getProblems: () => state.problems
  };
})();
