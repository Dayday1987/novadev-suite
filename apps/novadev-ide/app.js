(() => {
  'use strict';

  const MONACO_BASE = 'https://unpkg.com/monaco-editor@0.44.0/min/vs';
  const STORAGE_KEY = 'novadev_ide_project_v1';
  const SETTINGS_KEY = 'novadev_ide_settings_v1';
  const PROFILES_KEY = 'novadev_ide_profiles_v1';

  let editor = null;
  let tabs = []; // {name, model}
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
      'index.html': { content: '<!DOCTYPE html>\n<html>\n<head></head>\n<body></body>\n</html>', language: 'html' },
      'style.css': { content: 'body { margin:0; }', language: 'css' },
      'script.js': { content: 'console.log("NovaDev IDE");', language: 'javascript' }
    }
  };

  const $ = (s) => document.querySelector(s);
  const $$ = (s) => document.querySelectorAll(s);

  // Init
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
    setupExtensions();
    setupSidebarToggle();
  }

  // ------------------------
  // Load/Save Settings & Project
  // ------------------------
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
    if(currentTab) project.files[currentTab.name].content = editor.getValue();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
  }

  // ------------------------
  // Sidebar Toggle
  // ------------------------
  function setupSidebarToggle() {
    $('.sidebar-toggle').addEventListener('click', () => {
      const sidebar = $('.sidebar');
      sidebar.classList.toggle('open');
    });
  }

  // ------------------------
  // Activity Bar
  // ------------------------
  function setupActivityBar() {
    $$('.activity-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const view = btn.dataset.view;
        if(view==='settings'){ $('#settingsPanel').classList.remove('hidden'); return; }

        $$('.activity-btn').forEach(b=>b.classList.remove('active'));
        btn.classList.add('active');

        $$('.sidebar-view').forEach(v=>v.classList.remove('active'));
        $(`#${view}View`).classList.add('active');
      });
    });
  }

  // ------------------------
  // Sidebar / File tree
  // ------------------------
  function setupSidebar() {
    $('#newFileBtn').addEventListener('click', ()=> {
      const name = prompt('File name:');
      if(name && !project.files[name]){
        const lang = getLang(name);
        project.files[name] = { content:'', language: lang };
        saveProject();
        renderFileTree();
        openFile(name);
      }
    });

    $('#newFolderBtn').addEventListener('click', ()=> alert('Folder support coming soon.'));

    $('#projectNameInput').addEventListener('change',(e)=>{project.name=e.target.value; saveProject();});

    $('#searchInput').addEventListener('input',(e)=>{
      const query=e.target.value.toLowerCase();
      const results=[];
      Object.keys(project.files).forEach(f=>{
        project.files[f].content.split('\n').forEach((line,idx)=>{
          if(line.toLowerCase().includes(query)) results.push({filename:f,line:idx+1,text:line.trim()});
        });
      });
      renderSearchResults(results);
    });
  }

  function renderFileTree() {
    const tree=$('#fileTree'); tree.innerHTML='';
    Object.keys(project.files).sort().forEach(f=>{
      const item=document.createElement('div'); item.className='file-item';
      if(currentTab && currentTab.name===f) item.classList.add('active');
      const icon=document.createElement('span'); icon.className='file-icon'; icon.textContent=getFileIcon(f);
      const name=document.createElement('span'); name.className='file-name'; name.textContent=f;
      const actions=document.createElement('div'); actions.className='file-actions';
      const del=document.createElement('button'); del.className='file-action-btn'; del.textContent='×';
      del.addEventListener('click', e=>{
        e.stopPropagation(); if(confirm(`Delete ${f}?`)){ delete project.files[f]; saveProject(); renderFileTree(); closeTab(f); }
      });
      actions.appendChild(del); item.appendChild(icon); item.appendChild(name); item.appendChild(actions);
      item.addEventListener('click',()=>openFile(f));
      tree.appendChild(item);
    });
  }

  function getFileIcon(f){ const e=f.split('.').pop(); const map={html:'📄',css:'🎨',js:'📜'}; return map[e]||'📄'; }
  function getLang(f){ const e=f.split('.').pop(); const map={html:'html',css:'css',js:'javascript'}; return map[e]||'plaintext'; }

  // ------------------------
  // Tabs
  // ------------------------
  function renderTabs() {
    const tabsContainer=$('#editorTabs'); tabsContainer.innerHTML='';
    tabs.forEach(tab=>{
      const t=document.createElement('div'); t.className='editor-tab'; if(currentTab===tab) t.classList.add('active');
      const icon=document.createElement('span'); icon.textContent=getFileIcon(tab.name);
      const name=document.createElement('span'); name.textContent=tab.name;
      const close=document.createElement('button'); close.className='close-tab'; close.textContent='×';
      close.addEventListener('click', e=>{ e.stopPropagation(); closeTab(tab.name); });
      t.appendChild(icon); t.appendChild(name); t.appendChild(close);
      t.addEventListener('click', ()=>openTab(tab.name));
      tabsContainer.appendChild(t);
    });
  }

  function openFile(name){
    if(!project.files[name]) return;
    const existing = tabs.find(t=>t.name===name);
    if(!existing){
      const model = monaco.editor.createModel(project.files[name].content, project.files[name].language);
      const tab = {name, model}; tabs.push(tab);
    }
    openTab(name);
    renderTabs();
  }

  function openTab(name){
    const tab = tabs.find(t=>t.name===name); if(!tab) return;
    currentTab = tab; editor.setModel(tab.model); updateStatusBar(); if(livePreview) updatePreview();
  }

  function closeTab(name){
    const idx = tabs.findIndex(t=>t.name===name); if(idx<0) return;
    tabs[idx].model.dispose(); tabs.splice(idx,1);
    if(currentTab.name===name) currentTab = tabs[0]||null; if(currentTab) editor.setModel(currentTab.model);
    renderTabs(); updateStatusBar();
  }

  // ------------------------
  // Monaco Editor
  // ------------------------
  function initMonaco() {
    require.config({ paths:{vs:MONACO_BASE} });
    require(['vs/editor/editor.main'],()=>{
      const firstFile = Object.keys(project.files)[0];
      openFile(firstFile);

      editor = monaco.editor.create($('#editorContainer'), {
        value: project.files[firstFile].content,
        language: project.files[firstFile].language,
        theme: settings.theme,
        fontSize: settings.fontSize,
        tabSize: settings.tabSize,
        wordWrap: settings.wordWrap,
        minimap: { enabled: settings.minimap },
        lineNumbers: settings.lineNumbers ? 'on':'off',
        automaticLayout:true
      });

      // Auto-save
      editor.onDidChangeModelContent(() => {
  if (currentTab) {
    saveProject();
  }
});

      // Update cursor position
      editor.onDidChangeCursorPosition(() => {
        updateStatusBar();
      });

      // Update live preview on content change
      editor.onDidChangeModelContent(() => {
        if(currentTab){
          project.files[currentTab.name].content = editor.getValue();
          saveProject();
          updateStatusBar();
          if(livePreview) updatePreview();
        }
      });

      // Keyboard shortcuts
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_S, () => {
        saveProject();
        addTerminalLine('Project saved');
      });

      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_B, () => {
        $('.sidebar').classList.toggle('open');
      });

      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KEY_P, () => {
        toggleCommandPalette();
      });

      updateStatusBar();
    });
  }

  // ------------------------
  // Status Bar
  // ------------------------
  function updateStatusBar(){
    if(!editor || !currentTab) return;
    const pos = editor.getPosition();
    $('#cursorPosition').textContent = `Ln ${pos.lineNumber}, Col ${pos.column}`;
    $('#fileLanguage').textContent = project.files[currentTab.name].language.toUpperCase();
  }

  // ------------------------
  // Live Preview
  // ------------------------
  function setupExtensions(){
    // Live Preview toggle
    $('#livePreviewToggle').addEventListener('click', () => {
      livePreview = !livePreview;
      const frame = $('#livePreviewFrame');
      const editorDiv = $('#editorContainer');
      if(livePreview){
        frame.classList.remove('hidden');
        editorDiv.classList.add('half-width');
        updatePreview();
      } else {
        frame.classList.add('hidden');
        editorDiv.classList.remove('half-width');
        editorDiv.classList.add('full-width');
      }
    });

    // Prettier
    $('#prettierBtn').addEventListener('click', () => {
      if(currentTab){
        try{
          const lang = project.files[currentTab.name].language;
          if(['javascript','js'].includes(lang)){
            const formatted = prettier.format(editor.getValue(), { parser:'babel', plugins: prettierPlugins });
            editor.setValue(formatted);
            addTerminalLine(`Prettier formatted ${currentTab.name}`);
          } else if(lang==='css'){
            const formatted = prettier.format(editor.getValue(), { parser:'css', plugins: prettierPlugins });
            editor.setValue(formatted);
            addTerminalLine(`Prettier formatted ${currentTab.name}`);
          } else if(lang==='html'){
            const formatted = prettier.format(editor.getValue(), { parser:'html', plugins: prettierPlugins });
            editor.setValue(formatted);
            addTerminalLine(`Prettier formatted ${currentTab.name}`);
          } else {
            addTerminalLine(`Prettier: unsupported file type for ${currentTab.name}`);
          }
        } catch(e){
          addTerminalLine(`Prettier error: ${e.message}`);
        }
      }
    });

    // ESLint
    $('#eslintBtn').addEventListener('click', () => {
      if(currentTab && ['javascript','js'].includes(project.files[currentTab.name].language)){
        try{
          const linter = new eslint.Linter();
          const messages = linter.verify(editor.getValue(), { env: { browser:true, es6:true }, rules:{ semi:2, 'no-unused-vars':1 }});
          if(messages.length===0){
            addTerminalLine(`ESLint: No issues found in ${currentTab.name}`);
          } else {
            messages.forEach(msg=>{
              addTerminalLine(`ESLint: ${msg.line}:${msg.column} ${msg.message} (${msg.ruleId})`);
            });
          }
        } catch(e){
          addTerminalLine(`ESLint error: ${e.message}`);
        }
      } else {
        addTerminalLine('ESLint: Only JS files supported');
      }
    });
  }

  function updatePreview(){
    if(!currentTab) return;
    const frame = $('#livePreviewFrame');
    const html = project.files['index.html']?.content || '';
    const css = project.files['style.css']?.content || '';
    const js = project.files['script.js']?.content || '';
    frame.srcdoc = html.replace('</head>', `<style>${css}</style></head>`).replace('</body>', `<script>${js}</script></body>`);
  }

  // ------------------------
  // Terminal
  // ------------------------
  function setupTerminal(){
    const input = $('#terminalInput');
    addTerminalLine('NovaDev IDE Terminal v1.0.0');
    addTerminalLine('Type "help" for commands');
    addTerminalLine('');

    input.addEventListener('keydown',(e)=>{
      if(e.key==='Enter'){
        const cmd=input.value.trim();
        if(cmd){ addTerminalLine(`$ ${cmd}`); executeCommand(cmd); input.value=''; }
      }
    });
  }

  function addTerminalLine(text){
    const out=$('#terminalOutput');
    const line=document.createElement('div');
    line.className='terminal-line';
    line.textContent=text;
    out.appendChild(line);
    out.scrollTop=out.scrollHeight;
  }

  function executeCommand(cmd){
    const parts=cmd.split(' ');
    switch(parts[0]){
      case 'help':
        addTerminalLine('Commands: help, clear, ls, cat, pwd, echo');
        break;
      case 'clear':
        $('#terminalOutput').innerHTML=''; break;
      case 'ls':
        Object.keys(project.files).forEach(f=>addTerminalLine(f)); break;
      case 'cat':
        if(parts[1] && project.files[parts[1]]) addTerminalLine(project.files[parts[1]].content);
        else addTerminalLine(`cat: ${parts[1]}: No such file`);
        break;
      case 'pwd':
        addTerminalLine(`/${project.name}`); break;
      case 'echo':
        addTerminalLine(parts.slice(1).join(' ')); break;
      default:
        addTerminalLine(`${parts[0]}: command not found`);
    }
  }

  // ------------------------
  // Command Palette
  // ------------------------
  function setupCommandPalette(){
    const palette=$('#commandPalette'), input=$('#commandInput'), results=$('#commandResults');
    const commands=[
      {name:'File: New File', action:()=>$('#newFileBtn').click()},
      {name:'File: Save', action:()=>saveProject()},
      {name:'View: Toggle Terminal', action:()=>$('.panel').classList.toggle('hidden')},
      {name:'Preferences: Open Settings', action:()=>$('#settingsPanel').classList.remove('hidden')},
      {name:'Extensions: Run Prettier', action:()=>$('#prettierBtn').click()},
      {name:'Extensions: Run ESLint', action:()=>$('#eslintBtn').click()},
      {name:'Extensions: Toggle Live Preview', action:()=>$('#livePreviewToggle').click()}
    ];

    function filterCommands(query){ return commands.filter(c=>c.name.toLowerCase().includes(query.toLowerCase())); }

    input.addEventListener('input',()=>{ 
      results.innerHTML='';
      const filtered = filterCommands(input.value);
      filtered.forEach((cmd,i)=>{
        const item=document.createElement('div'); item.className='command-item'; if(i===0) item.classList.add('selected');
        item.textContent=cmd.name;
        item.addEventListener('click',()=>{ cmd.action(); toggleCommandPalette(false); input.value=''; });
        results.appendChild(item);
      });
    });

    document.addEventListener('keydown',(e)=>{
      if((e.ctrlKey||e.metaKey) && e.shiftKey && e.key==='P'){
        e.preventDefault(); toggleCommandPalette(true); input.focus();
      }
      if(e.key==='Escape') toggleCommandPalette(false);
    });
  }

  function toggleCommandPalette(show){
    const palette=$('#commandPalette');
    if(show===undefined) palette.classList.toggle('hidden');
    else palette.classList.toggle('hidden', !show);
  }

  // ------------------------
  // Panel Tabs
  // ------------------------
  function setupPanelTabs(){
    $$('.panel-tab').forEach(tab=>{
      tab.addEventListener('click',()=>{
        const panel=tab.dataset.panel;
        $$('.panel-tab').forEach(t=>t.classList.remove('active'));
        tab.classList.add('active');
        $$('.panel-view').forEach(v=>v.classList.remove('active'));
        $(`#${panel}Panel`).classList.add('active');
      });
    });
  }

  // ------------------------
  // Settings
  // ------------------------
  function setupSettings(){
    $('#closeSettings').addEventListener('click',()=>$('#settingsPanel').classList.add('hidden'));
    $('#themeSelect').addEventListener('change',(e)=>{ settings.theme=e.target.value; if(editor) monaco.editor.setTheme(settings.theme); saveSettings(); });
    $('#fontSizeInput').addEventListener('change',(e)=>{ settings.fontSize=parseInt(e.target.value); if(editor) editor.updateOptions({fontSize:settings.fontSize}); saveSettings(); });
    $('#tabSizeInput').addEventListener('change',(e)=>{ settings.tabSize=parseInt(e.target.value); if(editor) editor.updateOptions({tabSize:settings.tabSize}); saveSettings(); });
    $('#wordWrapSelect').addEventListener('change',(e)=>{ settings.wordWrap=e.target.value; if(editor) editor.updateOptions({wordWrap:settings.wordWrap}); saveSettings(); });
    $('#minimapToggle').addEventListener('change',(e)=>{ settings.minimap=e.target.checked; if(editor) editor.updateOptions({minimap:{enabled:settings.minimap}}); saveSettings(); });
    $('#lineNumbersToggle').addEventListener('change',(e)=>{ settings.lineNumbers=e.target.checked; if(editor) editor.updateOptions({lineNumbers:settings.lineNumbers?'on':'off'}); saveSettings(); });
  }

  // ------------------------
  // Start IDE
  // ------------------------
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();                                                 
