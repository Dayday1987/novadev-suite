/* NovaDev IDE - Main Application */

(() => {
  'use strict';

  // Configuration
  const MONACO_BASE = 'https://unpkg.com/monaco-editor@0.44.0/min/vs';
  const STORAGE_KEY = 'novadev_ide_project_v1';
  const SETTINGS_KEY = 'novadev_ide_settings_v1';

  // State
  let editor = null;
  let currentFile = null;
  let project = {
    name: 'my-project',
    files: {
      'index.html': {
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NovaDev Project</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <h1>Welcome to NovaDev IDE</h1>
  <p>Start building your project!</p>
  <script src="script.js"></script>
</body>
</html>`,
        language: 'html'
      },
      'style.css': {
        content: `body {
  font-family: system-ui, -apple-system, sans-serif;
  margin: 0;
  padding: 20px;
  background: #f5f5f5;
}

h1 {
  color: #333;
}`,
        language: 'css'
      },
      'script.js': {
        content: `console.log('NovaDev IDE is ready!');

// Your code here
`,
        language: 'javascript'
      }
    }
  };

  let settings = {
    theme: 'vs-dark',
    fontSize: 14,
    tabSize: 2,
    wordWrap: 'off',
    minimap: true,
    lineNumbers: true
  };

  // DOM Elements
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  // Initialize
  function init() {
    loadSettings();
    loadProject();
    setupActivityBar();
    setupSidebar();
    setupCommandPalette();
    setupSettings();
    setupTerminal();
    setupPanelTabs();
    initMonaco();
  }

  // Load settings from localStorage
  function loadSettings() {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (saved) {
      settings = { ...settings, ...JSON.parse(saved) };
    }
    applySettings();
  }

  // Save settings to localStorage
  function saveSettings() {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }

  // Apply settings to UI
  function applySettings() {
    $('#themeSelect').value = settings.theme;
    $('#fontSizeInput').value = settings.fontSize;
    $('#tabSizeInput').value = settings.tabSize;
    $('#wordWrapSelect').value = settings.wordWrap;
    $('#minimapToggle').checked = settings.minimap;
    $('#lineNumbersToggle').checked = settings.lineNumbers;
  }

  // Load project from localStorage
  function loadProject() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        project = JSON.parse(saved);
      } catch (e) {
        console.error('Failed to load project:', e);
      }
    }
    $('#projectNameInput').value = project.name;
    renderFileTree();
  }

  // Save project to localStorage
  function saveProject() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
  }

  // Activity Bar
  function setupActivityBar() {
    $$('.activity-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const view = btn.dataset.view;
        
        if (view === 'settings') {
          $('#settingsPanel').classList.remove('hidden');
          return;
        }

        // Update active state
        $$('.activity-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Show corresponding sidebar view
        $$('.sidebar-view').forEach(v => v.classList.remove('active'));
        $(`#${view}View`).classList.add('active');
      });
    });
  }

  // Sidebar
  function setupSidebar() {
    // New File
    $('#newFileBtn').addEventListener('click', () => {
      const name = prompt('Enter file name:');
      if (name && !project.files[name]) {
        const ext = name.split('.').pop();
        const language = getLanguageFromExtension(ext);
        project.files[name] = {
          content: '',
          language
        };
        saveProject();
        renderFileTree();
        openFile(name);
      }
    });

    // New Folder (simplified - just prefix)
    $('#newFolderBtn').addEventListener('click', () => {
      const name = prompt('Enter folder name:');
      if (name) {
        alert('Folder support coming soon! For now, use file names like "folder/file.js"');
      }
    });

    // Project name
    $('#projectNameInput').addEventListener('change', (e) => {
      project.name = e.target.value;
      saveProject();
    });

    // Search
    $('#searchInput').addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase();
      if (!query) {
        $('#searchResults').innerHTML = '';
        return;
      }

      const results = [];
      Object.keys(project.files).forEach(filename => {
        const content = project.files[filename].content;
        const lines = content.split('\n');
        lines.forEach((line, index) => {
          if (line.toLowerCase().includes(query)) {
            results.push({ filename, line: index + 1, text: line.trim() });
          }
        });
      });

      renderSearchResults(results);
    });

    // Git
    $('#gitInitBtn').addEventListener('click', () => {
      $('#gitPanel').classList.remove('hidden');
      addTerminalLine('Initialized empty Git repository');
    });

    $('#commitBtn').addEventListener('click', () => {
      const message = $('#commitMessage').value;
      if (message) {
        addTerminalLine(`[main ${Math.random().toString(36).substr(2, 7)}] ${message}`);
        addTerminalLine(`${Object.keys(project.files).length} files changed`);
        $('#commitMessage').value = '';
      }
    });
  }

  // Render file tree
  function renderFileTree() {
    const tree = $('#fileTree');
    tree.innerHTML = '';

    Object.keys(project.files).sort().forEach(filename => {
      const item = document.createElement('div');
      item.className = 'file-item';
      if (currentFile === filename) {
        item.classList.add('active');
      }

      const icon = document.createElement('span');
      icon.className = 'file-icon';
      icon.textContent = getFileIcon(filename);

      const name = document.createElement('span');
      name.className = 'file-name';
      name.textContent = filename;

      const actions = document.createElement('div');
      actions.className = 'file-actions';

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'file-action-btn';
      deleteBtn.textContent = '×';
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm(`Delete ${filename}?`)) {
          delete project.files[filename];
          saveProject();
          renderFileTree();
          if (currentFile === filename) {
            const remaining = Object.keys(project.files)[0];
            if (remaining) {
              openFile(remaining);
            } else {
              currentFile = null;
              renderTabs();
            }
          }
        }
      });

      actions.appendChild(deleteBtn);
      item.appendChild(icon);
      item.appendChild(name);
      item.appendChild(actions);

      item.addEventListener('click', () => openFile(filename));
      tree.appendChild(item);
    });
  }

  // Get file icon
  function getFileIcon(filename) {
    const ext = filename.split('.').pop();
    const icons = {
      html: '📄',
      css: '🎨',
      js: '📜',
      json: '📋',
      md: '📝',
      txt: '📃'
    };
    return icons[ext] || '📄';
  }

  // Get language from extension
  function getLanguageFromExtension(ext) {
    const map = {
      html: 'html',
      css: 'css',
      js: 'javascript',
      json: 'json',
      md: 'markdown',
      txt: 'plaintext'
    };
    return map[ext] || 'plaintext';
  }

  // Open file
  function openFile(filename) {
    if (!project.files[filename]) return;

    // Save current file content
    if (currentFile && editor) {
      project.files[currentFile].content = editor.getValue();
      saveProject();
    }

    currentFile = filename;
    renderFileTree();
    renderTabs();

    if (editor) {
      const file = project.files[filename];
      const model = monaco.editor.createModel(
        file.content,
        file.language
      );
      editor.setModel(model);
      updateStatusBar();
    }
  }

  // Render tabs
  function renderTabs() {
    const tabs = $('#editorTabs');
    tabs.innerHTML = '';

    if (!currentFile) return;

    const tab = document.createElement('div');
    tab.className = 'editor-tab active';

    const icon = document.createElement('span');
    icon.textContent = getFileIcon(currentFile);

    const name = document.createElement('span');
    name.textContent = currentFile;

    const closeBtn = document.createElement('button');
    closeBtn.className = 'close-tab';
    closeBtn.textContent = '×';
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      // For now, just switch to another file
      const files = Object.keys(project.files);
      const index = files.indexOf(currentFile);
      const nextFile = files[index + 1] || files[index - 1];
      if (nextFile) {
        openFile(nextFile);
      }
    });

    tab.appendChild(icon);
    tab.appendChild(name);
    tab.appendChild(closeBtn);
    tabs.appendChild(tab);
  }

  // Render search results
  function renderSearchResults(results) {
    const container = $('#searchResults');
    container.innerHTML = '';

    if (results.length === 0) {
      container.innerHTML = '<p class="muted">No results found</p>';
      return;
    }

    results.forEach(result => {
      const item = document.createElement('div');
      item.className = 'search-result-item';
      item.innerHTML = `
        <div><strong>${result.filename}</strong> : ${result.line}</div>
        <div class="muted">${result.text}</div>
      `;
      item.addEventListener('click', () => {
        openFile(result.filename);
        if (editor) {
          editor.setPosition({ lineNumber: result.line, column: 1 });
          editor.revealLineInCenter(result.line);
        }
      });
      container.appendChild(item);
    });
  }

  // Command Palette
  function setupCommandPalette() {
    const palette = $('#commandPalette');
    const input = $('#commandInput');
    const results = $('#commandResults');

    const commands = [
      { name: 'File: New File', action: () => $('#newFileBtn').click() },
      { name: 'File: Save', action: () => saveProject() },
      { name: 'View: Toggle Terminal', action: () => togglePanel() },
      { name: 'View: Command Palette', action: () => {} },
      { name: 'Preferences: Open Settings', action: () => $('#settingsPanel').classList.remove('hidden') },
      { name: 'Git: Initialize Repository', action: () => $('#gitInitBtn').click() },
      { name: 'Format Document', action: () => formatDocument() },
      { name: 'Export Project', action: () => exportProject() }
    ];

    // Toggle with Ctrl+Shift+P
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'P') {
        e.preventDefault();
        palette.classList.toggle('hidden');
        if (!palette.classList.contains('hidden')) {
          input.focus();
        }
      }
      // Close with Escape
      if (e.key === 'Escape') {
        palette.classList.add('hidden');
      }
    });

    input.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase();
      const filtered = commands.filter(cmd => 
        cmd.name.toLowerCase().includes(query)
      );

      results.innerHTML = '';
      filtered.forEach((cmd, index) => {
        const item = document.createElement('div');
        item.className = 'command-item';
        if (index === 0) item.classList.add('selected');
        item.textContent = cmd.name;
        item.addEventListener('click', () => {
          cmd.action();
          palette.classList.add('hidden');
          input.value = '';
        });
        results.appendChild(item);
      });
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const selected = results.querySelector('.command-item.selected');
        if (selected) {
          selected.click();
        }
      }
    });
  }

  // Settings
  function setupSettings() {
    $('#closeSettings').addEventListener('click', () => {
      $('#settingsPanel').classList.add('hidden');
    });

    $('#themeSelect').addEventListener('change', (e) => {
      settings.theme = e.target.value;
      if (editor) {
        monaco.editor.setTheme(settings.theme);
      }
      saveSettings();
    });

    $('#fontSizeInput').addEventListener('change', (e) => {
      settings.fontSize = parseInt(e.target.value);
      if (editor) {
        editor.updateOptions({ fontSize: settings.fontSize });
      }
      saveSettings();
    });

    $('#tabSizeInput').addEventListener('change', (e) => {
      settings.tabSize = parseInt(e.target.value);
      if (editor) {
        editor.updateOptions({ tabSize: settings.tabSize });
      }
      saveSettings();
    });

    $('#wordWrapSelect').addEventListener('change', (e) => {
      settings.wordWrap = e.target.value;
      if (editor) {
        editor.updateOptions({ wordWrap: settings.wordWrap });
      }
      saveSettings();
    });

    $('#minimapToggle').addEventListener('change', (e) => {
      settings.minimap = e.target.checked;
      if (editor) {
        editor.updateOptions({ minimap: { enabled: settings.minimap } });
      }
      saveSettings();
    });

    $('#lineNumbersToggle').addEventListener('change', (e) => {
      settings.lineNumbers = e.target.checked;
      if (editor) {
        editor.updateOptions({ lineNumbers: settings.lineNumbers ? 'on' : 'off' });
      }
      saveSettings();
    });
  }

  // Terminal
  function setupTerminal() {
    const input = $('#terminalInput');
    const output = $('#terminalOutput');

    // Welcome message
    addTerminalLine('NovaDev IDE Terminal v1.0.0');
    addTerminalLine('Type "help" for available commands');
    addTerminalLine('');

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const command = input.value.trim();
        if (command) {
          addTerminalLine(`$ ${command}`);
          executeCommand(command);
          input.value = '';
        }
      }
    });
  }

  function addTerminalLine(text) {
    const output = $('#terminalOutput');
    const line = document.createElement('div');
    line.className = 'terminal-line';
    line.textContent = text;
    output.appendChild(line);
    output.scrollTop = output.scrollHeight;
  }

  function executeCommand(command) {
    const parts = command.split(' ');
    const cmd = parts[0];

    switch (cmd) {
      case 'help':
        addTerminalLine('Available commands:');
        addTerminalLine('  help     - Show this help message');
        addTerminalLine('  clear    - Clear terminal');
        addTerminalLine('  ls       - List files');
        addTerminalLine('  cat      - Show file content');
        addTerminalLine('  pwd      - Print working directory');
        addTerminalLine('  echo     - Print message');
        break;
      case 'clear':
        $('#terminalOutput').innerHTML = '';
        break;
      case 'ls':
        Object.keys(project.files).forEach(file => {
          addTerminalLine(`  ${file}`);
        });
        break;
      case 'cat':
        if (parts[1] && project.files[parts[1]]) {
          addTerminalLine(project.files[parts[1]].content);
        } else {
          addTerminalLine(`cat: ${parts[1]}: No such file`);
        }
        break;
      case 'pwd':
        addTerminalLine(`/${project.name}`);
        break;
      case 'echo':
        addTerminalLine(parts.slice(1).join(' '));
        break;
      default:
        addTerminalLine(`${cmd}: command not found`);
    }
  }

  // Panel Tabs
  function setupPanelTabs() {
    $$('.panel-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const panel = tab.dataset.panel;
        
        $$('.panel-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        $$('.panel-view').forEach(v => v.classList.remove('active'));
        $(`#${panel}Panel`).classList.add('active');
      });
    });
  }

  function togglePanel() {
    const panel = $('.panel');
    panel.style.display = panel.style.display === 'none' ? 'flex' : 'none';
  }

  // Monaco Editor
  function initMonaco() {
    require.config({ paths: { vs: MONACO_BASE } });
    require(['vs/editor/editor.main'], () => {
      const firstFile = Object.keys(project.files)[0];
      const file = project.files[firstFile];

      editor = monaco.editor.create($('#editorContainer'), {
        value: file.content,
        language: file.language,
        theme: settings.theme,
        fontSize: settings.fontSize,
        tabSize: settings.tabSize,
        wordWrap: settings.wordWrap,
        minimap: { enabled: settings.minimap },
        lineNumbers: settings.lineNumbers ? 'on' : 'off',
        automaticLayout: true,
        scrollBeyondLastLine: false,
        renderWhitespace: 'selection',
        cursorBlinking: 'smooth',
        cursorSmoothCaretAnimation: true
      });

      currentFile = firstFile;
      renderFileTree();
      renderTabs();

      // Auto-save on change
      editor.onDidChangeModelContent(() => {
        if (currentFile) {
          project.files[currentFile].content = editor.getValue();
          saveProject();
          updateStatusBar();
        }
      });

      // Update cursor position
      editor.onDidChangeCursorPosition(() => {
        updateStatusBar();
      });

      // Keyboard shortcuts
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_S, () => {
        saveProject();
        addTerminalLine('Project saved');
      });

      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_B, () => {
        $('.sidebar').style.display = 
          $('.sidebar').style.display === 'none' ? 'flex' : 'none';
      });

      updateStatusBar();
    });
  }

  // Update status bar
  function updateStatusBar() {
    if (!editor || !currentFile) return;

    const position = editor.getPosition();
    $('#cursorPosition').textContent = `Ln ${position.lineNumber}, Col ${position.column}`;

    const language = project.files[currentFile].language;
    $('#fileLanguage').textContent = language.toUpperCase();
  }

  // Format document
  function formatDocument() {
    if (editor) {
      editor.getAction('editor.action.formatDocument').run();
      addTerminalLine('Document formatted');
    }
  }

  // Export project
  function exportProject() {
    // Create a simple HTML export
    const html = project.files['index.html']?.content || '';
    const css = project.files['style.css']?.content || '';
    const js = project.files['script.js']?.content || '';

    const fullHTML = html.replace('</head>', `<style>${css}</style></head>`)
                         .replace('</body>', `<script>${js}</script></body>`);

    const blob = new Blob([fullHTML], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name}.html`;
    a.click();
    URL.revokeObjectURL(url);

    addTerminalLine(`Exported ${project.name}.html`);
  }

  // Start the IDE
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
