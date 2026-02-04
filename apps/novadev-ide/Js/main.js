// ---- BASIC INTERACTION TEST ----

const sidebar = document.getElementById('sidebar');
const toggle = document.getElementById('toggleSidebar');
const testBtn = document.getElementById('testBtn');

toggle.addEventListener('pointerdown', e => {
  e.preventDefault();
  sidebar.classList.toggle('open');
});

testBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  alert('Button works');
});

// ---- MONACO INIT ----

require.config({
  paths: {
    vs: 'https://unpkg.com/monaco-editor@0.44.0/min/vs'
  }
});

require(['vs/editor/editor.main'], () => {
  monaco.editor.create(document.getElementById('editor'), {
    value: '<h1>Hello from Monaco</h1>',
    language: 'html',
    theme: 'vs-dark',
    automaticLayout: true,
    minimap: { enabled: false }
  });
});
