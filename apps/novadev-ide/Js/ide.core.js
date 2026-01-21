/* ide.core.js */
(() => {
  'use strict';

  const STORAGE_KEY = 'novadev_project_v2';
  const SETTINGS_KEY = 'novadev_settings_v2';
  const PROFILES_KEY = 'novadev_profiles_v2';

  const state = NovaIDE.state;

  /* ------------------ DEFAULT STATE ------------------ */

  state.settings = {
    theme: 'vs-dark',
    fontSize: 14,
    tabSize: 2,
    wordWrap: 'off',
    minimap: true,
    lineNumbers: true
  };

  state.profiles = {
    default: {
      name: 'Default',
      settings: { ...state.settings }
    }
  };

  state.currentProfile = 'default';

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

  /* ------------------ STORAGE ------------------ */

  function loadStorage() {
    try {
      const p = localStorage.getItem(STORAGE_KEY);
      const s = localStorage.getItem(SETTINGS_KEY);
      const pr = localStorage.getItem(PROFILES_KEY);

      if (p) state.project = JSON.parse(p);
      if (s) state.settings = { ...state.settings, ...JSON.parse(s) };
      if (pr) state.profiles = JSON.parse(pr);
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

  /* ------------------ FILES & TABS ------------------ */

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
  }

  function closeFile(name) {
    const idx = state.tabs.findIndex(t => t.name === name);
    if (idx === -1) return;

    state.tabs[idx].model.dispose();
    state.tabs.splice(idx, 1);

    if (state.currentTab === name) {
      state.currentTab = state.tabs[0]?.name || null;
      if (state.currentTab) {
        openFile(state.currentTab);
      } else {
        state.editor.setModel(null);
      }
    }
  }

  function createFile(name) {
    if (state.project.files[name]) return false;
    state.project.files[name] = {
      language: guessLang(name),
      content: ''
    };
    saveProject();
    openFile(name);
    return true;
  }

  function guessLang(name) {
    const ext = name.split('.').pop();
    return {
      js: 'javascript',
      html: 'html',
      css: 'css',
      json: 'json'
    }[ext] || 'plaintext';
  }

  /* ------------------ MONACO ------------------ */

  function initEditor() {
    const el = document.getElementById('editorContainer');
    if (!el) {
      console.error('[NovaIDE] #editorContainer missing');
      return;
    }

    state.editor = monaco.editor.create(el, {
      theme: state.settings.theme,
      fontSize: state.settings.fontSize,
      tabSize: state.settings.tabSize,
      wordWrap: state.settings.wordWrap,
      minimap: { enabled: state.settings.minimap },
      lineNumbers: state.settings.lineNumbers ? 'on' : 'off',
      automaticLayout: true
    });

    const first = Object.keys(state.project.files)[0];
    if (first) openFile(first);

    state.editor.onDidChangeModelContent(() => {
      saveProject();
    });
  }

  /* ------------------ PROFILES ------------------ */

  function switchProfile(key) {
    if (!state.profiles[key]) return;
    state.currentProfile = key;
    state.settings = { ...state.profiles[key].settings };

    monaco.editor.setTheme(state.settings.theme);
    state.editor.updateOptions({
      fontSize: state.settings.fontSize,
      tabSize: state.settings.tabSize
    });
  }

  /* ------------------ PUBLIC API ------------------ */

  NovaIDE.core = {
    init() {
      loadStorage();
      initEditor();
      console.log('[NovaIDE] Core initialized');
    },
    openFile,
    closeFile,
    createFile,
    saveProject,
    switchProfile,
    getState: () => state
  };
})();
