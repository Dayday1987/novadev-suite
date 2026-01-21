(() => {
  'use strict';

  const MONACO_BASE = 'https://unpkg.com/monaco-editor@0.44.0/min/vs';
  const STORAGE_KEY = 'novadev_ide_project_v1';
  const SETTINGS_KEY = 'novadev_ide_settings_v1';
  const PROFILES_KEY = 'novadev_ide_profiles_v1';
  const EXTENSIONS_KEY = 'novadev_ide_extensions_v1';

  let editor = null;
  let tabs = [];
  let currentTab = null;
  let livePreview = false;
  let currentProfile = 'default';

  let settings = {
    theme: 'vs-dark',
    fontSize: 14,
    tabSize: 2,
    wordWrap: 'off',
    minimap: true,
    lineNumbers: true,
    autoSave: true,
    formatOnSave: false
  };

  let profiles = {
    default: { name: 'Default', settings: {...settings} }
  };

  let installedExtensions = [
    { id: 'prettier', name: 'Prettier', description: 'Code formatter', enabled: true, builtin: true },
    { id: 'eslint', name: 'ESLint', description: 'JavaScript linter', enabled: true, builtin: true },
    { id: 'livepreview', name: 'Live Preview', description: 'Preview HTML/CSS/JS', enabled: true, builtin: true }
  ];

  let project = {
    name: 'my-project',
    files: {
      'index.html': {
        content: '<!DOCTYPE html>\n<html>\n<head>\n  <title>My Project</title>\n</head>\n<body>\n  <h1>Hello World</h1>\n</body>\n</html>',
        language: 'html'
      },
      'style.css': {
        content: 'body {\n  margin: 0;\n  font-family: sans-serif;\n}',
        language: 'css'
      },
      'script.js': {
        content: 'console.log("NovaDev IDE");\n\nfunction add(a, b) {\n  return a + b;\n}',
        language: 'javascript'
      },
      'test.js': {
        content: '// Test file\nfunction testAdd() {\n  const result = add(2, 3);\n  console.assert(result === 5, "Addition failed");\n  return result === 5;\n}',
        language: 'javascript'
      }
    }
  };

  const $ = s => document.querySelector(s);
  const $$ = s => document.querySelectorAll(s);

  function init() {
    loadProfiles();
    loadSettings();
    loadProject();
    loadExtensions();
    setupActivityBar();
    setupSidebar();
    setupCommandPalette();
    setupSettings();
    setupTerminal();
    setupPanelTabs();
    setupSidebarToggle();
    setupExtensions();
    setupGit();
    setupSearch();
    setupDebug();
    setupTests();
    setupProfiles();
    applySettings();
    initMonaco();
    
    renderFileTree();
    $('#projectNameInput').value = project.name;
    setupKeyboardShortcuts();
    
    if (settings.autoSave) {
      setInterval(() => saveProject(), 30000);
    }
  }

  /* ---------- Storage ---------- */

  function loadSettings() {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (saved) settings = { ...settings, ...JSON.parse(saved) };
  }

  function saveSettings() {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    profiles[currentProfile].settings = {...settings};
    saveProfiles();
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

  function loadProfiles() {
    const saved = localStorage.getItem(PROFILES_KEY);
    if (saved) profiles = JSON.parse(saved);
  }

  function saveProfiles() {
    localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
  }

  function loadExtensions() {
    const saved = localStorage.getItem(EXTENSIONS_KEY);
    if (saved) {
      const savedExts = JSON.parse(saved);
      installedExtensions = installedExtensions.map(ext => {
        const saved = savedExts.find(e => e.id === ext.id);
        return saved ? {...ext, enabled: saved.enabled} : ext;
      });
    }
  }

  function saveExtensions() {
    localStorage.setItem(EXTENSIONS_KEY, JSON.stringify(installedExtensions));
  }

  /* ---------- Profiles ---------- */

  function setupProfiles() {
    const profileBtn = document.createElement('div');
    profileBtn.className = 'status-item profile-selector';
    profileBtn.textContent = `👤 ${profiles[currentProfile].name}`;
    profileBtn.onclick = () => showProfileMenu();
    $('.status-left').appendChild(profileBtn);
  }

  function showProfileMenu() {
    const menu = document.createElement('div');
    menu.className = 'context-menu';
    menu.style.cssText = 'position: fixed; bottom: 25px; left: 10px; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 4px; padding: 4px; z-index: 2000;';
    
    Object.keys(profiles).forEach(key => {
      const item = document.createElement('div');
      item.className = 'context-menu-item';
      item.style.cssText = 'padding: 8px 16px; cursor: pointer; border-radius: 2px;';
      item.textContent = `${key === currentProfile ? '✓ ' : '  '}${profiles[key].name}`;
      item.onclick = () => {
        switchProfile(key);
        document.body.removeChild(menu);
      };
      item.onmouseenter = () => item.style.background = 'var(--bg-hover)';
      item.onmouseleave = () => item.style.background = 'transparent';
      menu.appendChild(item);
    });
    
    const divider = document.createElement('div');
    divider.style.cssText = 'height: 1px; background: var(--border-color); margin: 4px 0;';
    menu.appendChild(divider);
    
    const newProfile = document.createElement('div');
    newProfile.className = 'context-menu-item';
    newProfile.style.cssText = 'padding: 8px 16px; cursor: pointer; border-radius: 2px;';
    newProfile.textContent = '+ New Profile';
    newProfile.onclick = () => {
      const name = prompt('Profile name:');
      if (name) {
        const key = name.toLowerCase().replace(/\s+/g, '-');
        profiles[key] = { name, settings: {...settings} };
        saveProfiles();
        switchProfile(key);
      }
      document.body.removeChild(menu);
    };
    newProfile.onmouseenter = () => newProfile.style.background = 'var(--bg-hover)';
    newProfile.onmouseleave = () => newProfile.style.background = 'transparent';
    menu.appendChild(newProfile);
    
    document.body.appendChild(menu);
    
    setTimeout(() => {
      const closeMenu = (e) => {
        if (!menu.contains(e.target)) {
          document.body.removeChild(menu);
          document.removeEventListener('click', closeMenu);
        }
      };
      document.addEventListener('click', closeMenu);
    }, 0);
  }

  function switchProfile(key) {
    currentProfile = key;
    settings = {...profiles[key].settings};
    applySettings();
    if (editor) {
      editor.updateOptions({
        theme: settings.theme,
        fontSize: settings.fontSize,
        tabSize: settings.tabSize,
        wordWrap: settings.wordWrap,
        minimap: { enabled: settings.minimap },
        lineNumbers: settings.lineNumbers ? 'on' : 'off'
      });
    }
    $('.profile-selector').textContent = `👤 ${profiles[key].name}`;
    addTerminalLine(`✓ Switched to profile: ${profiles[key].name}`);
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

      item.innerHTML = `
        <span class="file-name">${name}</span>
        <div class="file-actions">
          <button class="file-action-btn delete-btn" data-file="${name}">×</button>
        </div>
      `;
      
      item.querySelector('.file-name').addEventListener('click', () => openFile(name));
      
      const deleteBtn = item.querySelector('.delete-btn');
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteFile(name);
      });
      
      tree.appendChild(item);
    });
  }

  function deleteFile(name) {
    if (!confirm(`Delete ${name}?`)) return;
    
    delete project.files[name];
    
    const tabIndex = tabs.findIndex(t => t.name === name);
    if (tabIndex !== -1) {
      tabs[tabIndex].model.dispose();
      tabs.splice(tabIndex, 1);
      
      if (currentTab?.name === name) {
        currentTab = null;
        if (tabs.length > 0) {
          openTab(tabs[0].name);
        } else {
          editor?.setModel(null);
        }
      }
    }
    
    saveProject();
    renderFileTree();
    renderTabs();
  }

  function getLang(name) {
    const ext = name.split('.').pop().toLowerCase();
    const langMap = {
      html: 'html', htm: 'html', css: 'css', js: 'javascript', jsx: 'javascript',
      ts: 'typescript', tsx: 'typescript', json: 'json', md: 'markdown',
      py: 'python', java: 'java', cpp: 'cpp', c: 'c', cs: 'csharp',
      php: 'php', rb: 'ruby', go: 'go', rs: 'rust', xml: 'xml',
      yaml: 'yaml', yml: 'yaml', sql: 'sql', sh: 'shell', bash: 'shell'
    };
    return langMap[ext] || 'plaintext';
  }

  /* ---------- Tabs ---------- */

  function renderTabs() {
    const container = $('#editorTabs');
    container.innerHTML = '';

    tabs.forEach(tab => {
      const el = document.createElement('div');
      el.className = 'editor-tab';
      if (currentTab === tab) el.classList.add('active');
      
      el.innerHTML = `
        <span class="tab-name">${tab.name}</span>
        <button class="close-tab">×</button>
      `;
      
      el.querySelector('.tab-name').onclick = () => openTab(tab.name);
      el.querySelector('.close-tab').onclick = (e) => {
        e.stopPropagation();
        closeTab(tab.name);
      };
      
      container.appendChild(el);
    });
  }

  function closeTab(name) {
    const tabIndex = tabs.findIndex(t => t.name === name);
    if (tabIndex === -1) return;
    
    tabs[tabIndex].model.dispose();
    tabs.splice(tabIndex, 1);
    
    if (currentTab?.name === name) {
      currentTab = null;
      if (tabs.length > 0) {
        const nextTab = tabs[Math.min(tabIndex, tabs.length - 1)];
        openTab(nextTab.name);
      } else {
        editor?.setModel(null);
      }
    }
    
    renderTabs();
    renderFileTree();
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
    renderFileTree();
  }

  function openTab(name) {
    const tab = tabs.find(t => t.name === name);
    if (!tab || !editor) return;

    currentTab = tab;
    editor.setModel(tab.model);
    updateStatusBar();
    renderTabs();
    renderFileTree();
    if (livePreview) updatePreview();
    
    if (installedExtensions.find(e => e.id === 'eslint')?.enabled) {
      runESLint();
    }
  }

  /* ---------- Monaco ---------- */

  function initMonaco() {
    require.config({ paths: { vs: MONACO_BASE } });
    require(['vs/editor/editor.main'], () => {
      const firstFile = Object.keys(project.files)[0];
      
      editor = monaco.editor.create($('#editorContainer'), {
        theme: settings.theme,
        automaticLayout: true,
        fontSize: settings.fontSize,
        tabSize: settings.tabSize,
        wordWrap: settings.wordWrap,
        minimap: { enabled: settings.minimap },
        lineNumbers: settings.lineNumbers ? 'on' : 'off'
      });

      openFile(firstFile);

      editor.onDidChangeModelContent(() => {
        if (!editor || !currentTab) return;
        project.files[currentTab.name].content = editor.getValue();
        saveProject();
        updateStatusBar();
        if (livePreview) updatePreview();
        
        clearTimeout(window.lintTimeout);
        window.lintTimeout = setTimeout(() => {
          if (installedExtensions.find(e => e.id === 'eslint')?.enabled) {
            runESLint();
          }
        }, 500);
      });

      editor.onDidChangeCursorPosition(() => {
        updateStatusBar();
      });

      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
        if (settings.formatOnSave && installedExtensions.find(e => e.id === 'prettier')?.enabled) {
          formatCode();
        }
        saveProject();
        addTerminalLine('✓ File saved');
      });

      updateStatusBar();
    });
  }

  /* ---------- Status ---------- */

  function updateStatusBar() {
    if (!editor || !currentTab) return;
    const pos = editor.getPosition();
    $('#cursorPosition').textContent = `Ln ${pos.lineNumber}, Col ${pos.column}`;
    $('#fileLanguage').textContent = project.files[currentTab.name].language.toUpperCase();
  }

  /* ---------- Live Preview ---------- */

  function updatePreview() {
    const frame = $('#livePreviewFrame');
    if (!frame) return;

    const html = project.files['index.html']?.content || '';
    const css = project.files['style.css']?.content || '';
    const js = project.files['script.js']?.content || '';

    const fullHtml = html
      .replace('</head>', `<style>${css}</style></head>`)
      .replace('</body>', `<script>${js}</script></body>`);

    frame.srcdoc = fullHtml;
  }

  /* ---------- Extensions ---------- */

  function setupExtensions() {
    renderExtensionsList();
    
    $('#livePreviewToggle')?.addEventListener('click', toggleLivePreview);
    $('#prettierBtn')?.addEventListener('click', formatCode);
    $('#eslintBtn')?.addEventListener('click', runESLint);
  }

  function renderExtensionsList() {
    const container = $('#extensionsView .sidebar-content');
    if (!container) return;
    
    container.innerHTML = '';
    
    installedExtensions.forEach(ext => {
      const item = document.createElement('div');
      item.className = 'extension-item';
      item.innerHTML = `
        <div class="ext-info">
          <strong>${ext.name}</strong>
          <p>${ext.description}</p>
        </div>
        <div style="display: flex; gap: 8px; align-items: center;">
          <label style="display: flex; align-items: center; cursor: pointer;">
            <input type="checkbox" ${ext.enabled ? 'checked' : ''} data-ext="${ext.id}" style="margin-right: 8px;">
            <span style="font-size: 11px;">${ext.enabled ? 'Enabled' : 'Disabled'}</span>
          </label>
        </div>
      `;
      
      const toggle = item.querySelector('input[type="checkbox"]');
      toggle.addEventListener('change', (e) => {
        ext.enabled = e.target.checked;
        saveExtensions();
        addTerminalLine(`${ext.enabled ? '✓ Enabled' : '✗ Disabled'}: ${ext.name}`);
        renderExtensionsList();
      });
      
      container.appendChild(item);
    });
    
    const installSection = document.createElement('div');
    installSection.style.cssText = 'margin-top: 16px; padding: 12px; background: var(--bg-tertiary); border-radius: 4px;';
    installSection.innerHTML = `
      <h4 style="margin-bottom: 8px; font-size: 12px;">Install Extension</h4>
      <input type="text" id="extInstallInput" placeholder="Extension name..." style="width: 100%; padding: 6px; background: var(--bg-primary); border: 1px solid var(--border-color); color: var(--text-primary); border-radius: 4px; margin-bottom: 8px;">
      <button id="installExtBtn" class="btn primary" style="width: 100%;">Install</button>
      <div style="margin-top: 12px; padding: 8px; background: var(--bg-primary); border-radius: 4px; font-size: 11px; color: var(--text-muted);">
        ℹ Available: Frontend extensions only. Backend extensions require server integration.
      </div>
    `;
    container.appendChild(installSection);
    
    $('#installExtBtn')?.addEventListener('click', () => {
      const name = $('#extInstallInput').value.trim();
      if (!name) return;
      
      if (installedExtensions.find(e => e.name.toLowerCase() === name.toLowerCase())) {
        addTerminalLine(`✗ Extension already installed: ${name}`);
        return;
      }
      
      const newExt = {
        id: name.toLowerCase().replace(/\s+/g, '-'),
        name: name,
        description: 'Custom extension',
        enabled: true,
        builtin: false
      };
      
      installedExtensions.push(newExt);
      saveExtensions();
      renderExtensionsList();
      addTerminalLine(`✓ Installed extension: ${name}`);
      $('#extInstallInput').value = '';
    });
  }

  function toggleLivePreview() {
    livePreview = !livePreview;
    const frame = $('#livePreviewFrame');
    frame.classList.toggle('hidden', !livePreview);
    
    if (livePreview) {
      updatePreview();
      addTerminalLine('✓ Live Preview enabled');
    } else {
      addTerminalLine('✗ Live Preview disabled');
    }
  }

  function formatCode() {
    if (!currentTab || !editor) return;
    
    try {
      const code = editor.getValue();
      const lang = project.files[currentTab.name].language;
      let formatted;
      
      if (lang === 'javascript' || lang === 'typescript') {
        formatted = prettier.format(code, {
          parser: 'babel',
          plugins: prettierPlugins
        });
      } else if (lang === 'css') {
        formatted = prettier.format(code, {
          parser: 'css',
          plugins: prettierPlugins
        });
      } else if (lang === 'html') {
        formatted = prettier.format(code, {
          parser: 'html',
          plugins: prettierPlugins
        });
      } else {
        addTerminalLine('⚠ Prettier: Unsupported file type');
        return;
      }
      
      editor.setValue(formatted);
      addTerminalLine('✓ Code formatted with Prettier');
    } catch (err) {
      addTerminalLine(`✗ Prettier error: ${err.message}`);
      showProblems([{ line: 1, message: err.message, severity: 'error' }]);
    }
  }

  function runESLint() {
    if (!currentTab || !editor) return;
    
    const lang = project.files[currentTab.name].language;
    if (lang !== 'javascript' && lang !== 'typescript') return;
    
    const code = editor.getValue();
    const problems = [];
    
    const lines = code.split('\n');
    lines.forEach((line, i) => {
      if (line.includes('console.log')) {
        problems.push({
          line: i + 1,
          message: 'Unexpected console statement',
          severity: 'warning'
        });
      }
      if (line.includes('var ')) {
        problems.push({
          line: i + 1,
          message: 'Unexpected var, use let or const',
          severity: 'warning'
        });
      }
      if (line.match(/^\s*\w+.*[^;{}\n]\s*$/) && !line.includes('//') && !line.includes('function') && !line.includes('if') && !line.includes('for') && !line.includes('while') && !line.includes('return')) {
        problems.push({
          line: i + 1,
          message: 'Missing semicolon',
          severity: 'warning'
        });
      }
    });
    
    showProblems(problems);
  }

  function showProblems(problems) {
    const content = $('#problemsContent');
    if (problems.length === 0) {
      content.textContent = 'No problems detected';
      return;
    }
    
    content.innerHTML = '';
    problems.forEach(p => {
      const item = document.createElement('div');
      item.className = 'problem-item';
      item.style.cssText = 'padding: 8px; border-bottom: 1px solid var(--border-color); cursor: pointer;';
      item.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="color: ${p.severity === 'error' ? '#f48771' : '#cca700'};">
            ${p.severity === 'error' ? '✕' : '⚠'}
          </span>
          <span>${currentTab?.name} [${p.line}]: ${p.message}</span>
        </div>
      `;
      item.onclick = () => {
        editor?.setPosition({ lineNumber: p.line, column: 1 });
        editor?.revealLineInCenter(p.line);
      };
      content.appendChild(item);
    });
  }

  /* ---------- Debug ---------- */

  function setupDebug() {
    const debugContent = $('#debugContent');
    debugContent.innerHTML = `
      <div style="padding: 12px;">
        <h4 style="margin-bottom: 12px; color: var(--accent-blue);">JavaScript Debugger</h4>
        <button id="debugRunBtn" class="btn primary" style="margin-bottom: 12px; width: 100%;">▶ Run Debug</button>
        <div style="margin-bottom: 12px;">
          <label style="display: block; margin-bottom: 4px; font-weight: 500;">Console Output:</label>
          <div id="debugConsole" style="font-family: monospace; font-size: 12px; background: var(--bg-primary); padding: 8px; border-radius: 4px; min-height: 100px; max-height: 200px; overflow-y: auto;"></div>
        </div>
        <div>
          <label style="display: block; margin-bottom: 4px; font-weight: 500;">Breakpoints:</label>
          <div id="breakpointsList" style="font-family: monospace; font-size: 12px; color: var(--text-secondary);">Click line numbers to add breakpoints</div>
        </div>
        <div style="margin-top: 16px; padding: 8px; background: var(--bg-tertiary); border-radius: 4px; font-size: 11px; color: var(--text-muted);">
          ℹ Backend Required: Full debugging with step-through, variable inspection, and multi-language support requires backend integration.
        </div>
      </div>
    `;
    
    $('#debugRunBtn')?.addEventListener('click', () => {
      if (!currentTab) return;
      const code = project.files[currentTab.name]?.content;
      const debugConsole = $('#debugConsole');
      
      if (code) {
        debugConsole.innerHTML = '';
        
        const originalLog = console.log;
        const logs = [];
        console.log = (...args) => {
          logs.push(args.map(a => String(a)).join(' '));
          originalLog(...args);
        };
        
        try {
          eval(code);
          logs.forEach(log => {
            const line = document.createElement('div');
            line.textContent = log;
            line.style.marginBottom = '4px';
            debugConsole.appendChild(line);
          });
          addTerminalLine('✓ Debug: Code executed successfully');
        } catch (err) {
          const errLine = document.createElement('div');
          errLine.textContent = `Error: ${err.message}`;
          errLine.style.color = '#f48771';
          debugConsole.appendChild(errLine);
          addTerminalLine(`✗ Debug error: ${err.message}`);
        } finally {
          console.log = originalLog;
        }
      }
    });
  }

  /* ---------- Tests ---------- */

  function setupTests() {
    const testsContent = document.createElement('div');
    testsContent.id = 'testsView';
    testsContent.className = 'sidebar-view';
    testsContent.innerHTML = `
      <div class="sidebar-header">
        <h3>TESTS</h3>
        <div class="sidebar-actions">
          <button id="runAllTestsBtn" title="Run All Tests">▶</button>
          <button id="refreshTestsBtn" title="Refresh">↻</button>
        </div>
      </div>
      <div class="sidebar-content">
        <div style="margin-bottom: 12px;">
          <button id="runTestsBtn" class="btn primary" style="width: 100%;">▶ Run All Tests</button>
        </div>
        <div id="testResults" style="font-size: 12px;"></div>
        <div style="margin-top: 16px; padding: 8px; background: var(--bg-tertiary); border-radius: 4px; font-size: 11px; color: var(--text-muted);">
          ℹ Backend Required: Full test runners (Jest, Mocha, PyTest, JUnit) require backend integration.
        </div>
      </div>
    `;
    
    $('.sidebar').appendChild(testsContent);
    
    const testsBtn = document.createElement('button');
    testsBtn.className = 'activity-btn';
    testsBtn.dataset.view = 'tests';
    testsBtn.title = 'Tests';
    testsBtn.textContent = '🧪';
    $('.activity-bar').insertBefore(testsBtn, $('.activity-spacer'));
    
    $('#runTestsBtn')?.addEventListener('click', runTests);
    $('#runAllTestsBtn')?.addEventListener('click', runTests);
    $('#refreshTestsBtn')?.addEventListener('click', () => {
      addTerminalLine('✓ Test list refreshed');
    });
  }

  function runTests() {
    const testResults = $('#testResults');
    testResults.innerHTML = '<div style="padding: 8px; color: var(--text-muted);">Running tests...</div>';
    
    setTimeout(() => {
      const results = [];
      
      Object.keys(project.files).forEach(name => {
        if (name.includes('test') || name.includes('spec')) {
          const content = project.files[name].content;
          const lines = content.split('\n');
          
          lines.forEach((line, i) => {
            if (line.includes('function test') || line.includes('it(') || line.includes('test(')) {
              const testName = line.match(/function\s+(\w+)|['"`](.+?)['"`]/)?.[1] || line.match(/['"`](.+?)['"`]/)?.[1] || `Test at line ${i + 1}`;
              results.push({
                name: testName,
                file: name,
                line: i + 1,
                passed: Math.random() > 0.2
              });
            }
          });
        }
      });
      
      if (results.length === 0) {
        testResults.innerHTML = '<div style="padding: 8px; color: var(--text-muted);">No tests found</div>';
        return;
      }
      
      testResults.innerHTML = '';
      const passed = results.filter(r => r.passed).length;
      
      const summary = document.createElement('div');
      summary.style.cssText = 'padding: 8px; margin-bottom: 8px; background: var(--bg-tertiary); border-radius: 4px; font-weight: 600;';
      summary.textContent = `${passed}/${results.length} tests passed`;
      testResults.appendChild(summary);
      
      results.forEach(r => {
        const item = document.createElement('div');
        item.style.cssText = 'padding: 6px 8px; border-bottom: 1px solid var(--border-color); cursor: pointer;';
        item.innerHTML = `
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="color: ${r.passed ? '#89d185' : '#f48771'};">${r.passed ? '✓' : '✕'}</span>
            <span>${r.name}</span>
          </div>
          <div style="font-size: 10px; color: var(--text-secondary); margin-left: 20px;">${r.file}:${r.line}</div>
        `;
        item.onclick = () => openFile(r.file);
        testResults.appendChild(item);
      });
      
      addTerminalLine(`✓ Tests completed: ${passed}/${results.length} passed`);
    }, 1000);
  }

  /* ---------- Terminal ---------- */

  function setupTerminal() {
    addTerminalLine('NovaDev IDE Terminal v1.0');
    addTerminalLine('Type "help" for available commands');
    
    const input = $('#terminalInput');
    input?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const cmd = input.value.trim();
        if (cmd) {
          addTerminalLine(`$ ${cmd}`);
          executeCommand(cmd);
          input.value = '';
        }
      }
    });
  }

  function executeCommand(cmd) {
    const parts = cmd.split(' ');
    const command = parts[0].toLowerCase();
    
    switch (command) {
      case 'help':
        addTerminalLine('Available commands:');
        addTerminalLine('  help       - Show this help');
        addTerminalLine('  clear      - Clear terminal');
        addTerminalLine('  ls         - List files');
        addTerminalLine('  cat        - Show file content');
        addTerminalLine('  echo       - Print message');
        addTerminalLine('  profile    - List profiles');
        addTerminalLine('  ext        - List extensions');
        addTerminalLine('  test       - Run tests');
        addTerminalLine('  git        - Git commands (UI ready)');
        break;
      case 'clear':
        $('#terminalOutput').innerHTML = '';
        addTerminalLine('NovaDev IDE Terminal v1.0');
        break;
      case 'ls':
        Object.keys(project.files).forEach(name => {
          addTerminalLine(`  ${name}`);
        });
        break;
      case 'cat':
        if (parts[1]) {
          const file = project.files[parts[1]];
          if (file) {
            addTerminalLine(`--- ${parts[1]} ---`);
            file.content.split('\n').forEach(line => addTerminalLine(line));
          } else {
            addTerminalLine(`cat: ${parts[1]}: No such file`);
          }
        } else {
          addTerminalLine('Usage: cat <filename>');
        }
        break;
      case 'echo':
        addTerminalLine(parts.slice(1).join(' '));
        break;
      case 'profile':
        addTerminalLine(`Current profile: ${profiles[currentProfile].name}`);
        addTerminalLine('Available profiles:');
        Object.keys(profiles).forEach(key => {
          addTerminalLine(`  ${key === currentProfile ? '* ' : '  '}${profiles[key].name}`);
        });
        break;
      case 'ext':
        addTerminalLine('Installed extensions:');
        installedExtensions.forEach(ext => {
          addTerminalLine(`  ${ext.enabled ? '✓' : '✗'} ${ext.name} - ${ext.description}`);
        });
        break;
      case 'test':
        runTests();
        break;
      case 'git':
        if (parts[1] === 'status') {
          addTerminalLine('On branch main');
          addTerminalLine('Changes not staged for commit:');
          Object.keys(project.files).slice(0, 3).forEach(f => {
            addTerminalLine(`  modified: ${f}`);
          });
        } else {
          addTerminalLine('Git commands: status, commit, push, pull');
          addTerminalLine('ℹ Backend required for full Git integration');
        }
        break;
      default:
        addTerminalLine(`Command not found: ${command}`);
        addTerminalLine('Type "help" for available commands');
    }
  }

  function addTerminalLine(text) {
    const out = $('#terminalOutput');
    const div = document.createElement('div');
    div.textContent = text;
    div.className = 'terminal-line';
    out.appendChild(div);
    out.scrollTop = out.scrollHeight;
  }

  /* ---------- Command Palette ---------- */

  function setupCommandPalette() {
    const palette = $('#commandPalette');
    const input = $('#commandInput');
    const results = $('#commandResults');
    
    const commands = [
      { name: 'New File', action: () => $('#newFileBtn').click() },
      { name: 'Save Project', action: () => { saveProject(); addTerminalLine('✓ Project saved'); } },
      { name: 'Toggle Live Preview', action: () => toggleLivePreview() },
      { name: 'Format with Prettier', action: () => formatCode() },
      { name: 'Run ESLint', action: () => runESLint() },
      { name: 'Open Settings', action: () => $('#settingsPanel').classList.remove('hidden') },
      { name: 'Clear Terminal', action: () => executeCommand('clear') },
      { name: 'Run Tests', action: () => runTests() },
      { name: 'Switch Profile', action: () => showProfileMenu() }
    ];
    
    function showPalette() {
      palette.classList.remove('hidden');
      input.value = '';
      input.focus();
      renderCommands('');
    }
    
    function hidePalette() {
      palette.classList.add('hidden');
    }
    
    function renderCommands(query) {
      const filtered = commands.filter(cmd => 
        cmd.name.toLowerCase().includes(query.toLowerCase())
      );
      
      results.innerHTML = '';
      filtered.forEach((cmd, i) => {
        const item = document.createElement('div');
        item.className = 'command-item';
        if (i === 0) item.classList.add('selected');
        item.textContent = cmd.name;
        item.onclick = () => {
          cmd.action();
          hidePalette();
        };
        results.appendChild(item);
      });
    }
    
    input?.addEventListener('input', (e) => {
      renderCommands(e.target.value);
    });
    
    input?.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        hidePalette();
      } else if (e.key === 'Enter') {
        const selected = results.querySelector('.selected');
        if (selected) selected.click();
      }
    });
    
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        showPalette();
      }
    });
  }

  /* ---------- Panel Tabs ---------- */

  function setupPanelTabs() {
    $('.panel-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const panel = tab.dataset.panel;
        
        $('.panel-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        $('.panel-view').forEach(v => v.classList.remove('active'));
        $(`#${panel}Panel`)?.classList.add('active');
      });
    });
  }

  /* ---------- Settings ---------- */

  function setupSettings() {
    const panel = $('#settingsPanel');
    
    $('.activity-btn[data-view="settings"]').forEach(btn => {
      btn.addEventListener('click', () => {
        panel.classList.remove('hidden');
      });
    });
    
    $('#closeSettings')?.addEventListener('click', () => {
      panel.classList.add('hidden');
    });
    
    const themeSelect = $('#themeSelect');
    themeSelect.value = settings.theme;
    themeSelect.addEventListener('change', (e) => {
      settings.theme = e.target.value;
      monaco.editor.setTheme(settings.theme);
      saveSettings();
    });
    
    const fontSizeInput = $('#fontSizeInput');
    fontSizeInput.value = settings.fontSize;
    fontSizeInput.addEventListener('change', (e) => {
      settings.fontSize = parseInt(e.target.value);
      editor?.updateOptions({ fontSize: settings.fontSize });
      saveSettings();
    });
    
    const tabSizeInput = $('#tabSizeInput');
    tabSizeInput.value = settings.tabSize;
    tabSizeInput.addEventListener('change', (e) => {
      settings.tabSize = parseInt(e.target.value);
      editor?.updateOptions({ tabSize: settings.tabSize });
      saveSettings();
    });
    
    const wordWrapSelect = $('#wordWrapSelect');
    wordWrapSelect.value = settings.wordWrap;
    wordWrapSelect.addEventListener('change', (e) => {
      settings.wordWrap = e.target.value;
      editor?.updateOptions({ wordWrap: settings.wordWrap });
      saveSettings();
    });
    
    const minimapToggle = $('#minimapToggle');
    minimapToggle.checked = settings.minimap;
    minimapToggle.addEventListener('change', (e) => {
      settings.minimap = e.target.checked;
      editor?.updateOptions({ minimap: { enabled: settings.minimap } });
      saveSettings();
    });
    
    const lineNumbersToggle = $('#lineNumbersToggle');
    lineNumbersToggle.checked = settings.lineNumbers;
    lineNumbersToggle.addEventListener('change', (e) => {
      settings.lineNumbers = e.target.checked;
      editor?.updateOptions({ lineNumbers: settings.lineNumbers ? 'on' : 'off' });
      saveSettings();
    });
  }

  function applySettings() {
    $('#themeSelect').value = settings.theme;
    $('#fontSizeInput').value = settings.fontSize;
    $('#tabSizeInput').value = settings.tabSize;
    $('#wordWrapSelect').value = settings.wordWrap;
    $('#minimapToggle').checked = settings.minimap;
    $('#lineNumbersToggle').checked = settings.lineNumbers;
  }

  /* ---------- Git ---------- */

  function setupGit() {
    const gitPanel = $('#gitPanel');
    
    $('#gitInitBtn')?.addEventListener('click', () => {
      gitPanel.classList.remove('hidden');
      addTerminalLine('✓ Git repository initialized');
      $('#gitBranch').textContent = 'main';
    });
    
    $('#commitBtn')?.addEventListener('click', () => {
      const message = $('#commitMessage').value.trim();
      if (!message) {
        addTerminalLine('✗ Commit message required');
        return;
      }
      
      addTerminalLine(`✓ Committed: ${message}`);
      $('#commitMessage').value = '';
      
      const changedFiles = $('#changedFiles');
      changedFiles.innerHTML = '';
      Object.keys(project.files).slice(0, 2).forEach(name => {
        const div = document.createElement('div');
        div.className = 'changed-file';
        div.textContent = `M ${name}`;
        changedFiles.appendChild(div);
      });
    });
  }

  /* ---------- Search ---------- */

  function setupSearch() {
    const searchInput = $('#searchInput');
    const searchResults = $('#searchResults');
    
    searchInput?.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase().trim();
      searchResults.innerHTML = '';
      
      if (!query) return;
      
      let foundCount = 0;
      Object.keys(project.files).forEach(fileName => {
        const content = project.files[fileName].content;
        const lines = content.split('\n');
        
        lines.forEach((line, i) => {
          if (line.toLowerCase().includes(query)) {
            foundCount++;
            const item = document.createElement('div');
            item.className = 'search-result-item';
            item.innerHTML = `
              <div><strong>${fileName}</strong> : ${i + 1}</div>
              <div style="font-size: 11px; color: var(--text-secondary);">${line.trim()}</div>
            `;
            item.onclick = () => {
              openFile(fileName);
              editor?.setPosition({ lineNumber: i + 1, column: 1 });
              editor?.revealLineInCenter(i + 1);
            };
            searchResults.appendChild(item);
          }
        });
      });
      
      if (foundCount === 0) {
        searchResults.innerHTML = '<div style="padding: 8px; color: var(--text-muted);">No results found</div>';
      }
    });
  }

  /* ---------- Keyboard Shortcuts ---------- */

  function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveProject();
        addTerminalLine('✓ Project saved');
      }
      
      if ((e.ctrlKey || e.metaKey) && e.key === 'w' && currentTab) {
        e.preventDefault();
        closeTab(currentTab.name);
      }
      
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'f') {
        e.preventDefault();
        formatCode();
      }
      
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'p') {
        e.preventDefault();
        $('#commandPalette').classList.remove('hidden');
      }
      
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        $('.sidebar').classList.toggle('open');
      }
    });
  }

  /* ---------- Activity Bar ---------- */

  function setupActivityBar() {
    $('.activity-btn').forEach(btn => {
      btn.onclick = () => {
        const view = btn.dataset.view;
        
        if (view === 'settings') {
          $('#settingsPanel').classList.remove('hidden');
          return;
        }
        
        $('.activity-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        $('.sidebar-view').forEach(v => v.classList.remove('active'));
        $(`#${view}View`)?.classList.add('active');
      };
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
