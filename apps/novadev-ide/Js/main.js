/* ==============================
   NovaDev IDE - Stable Build
============================== */

const STORAGE_KEY = "novadev_ide_project_v1";
const SETTINGS_KEY = "novadev_ide_settings_v1";

let editor = null;
let files = {};
let currentFile = null;
let gitInitialized = false;
let gitHistory = [];

/* ==============================
   LOAD PROJECT DATA FIRST
============================== */

loadProject();

/* ==============================
   SETUP UI IMMEDIATELY
   (Important Fix)
============================== */

document.addEventListener("DOMContentLoaded", () => {
  setupUI();
  setupShortcuts();
});

/* ==============================
   MONACO LOAD (Async Safe)
============================== */

require.config({
  paths: { vs: "https://unpkg.com/monaco-editor@0.44.0/min/vs" }
});

require(["vs/editor/editor.main"], function () {

  editor = monaco.editor.create(document.getElementById("editor"), {
    value: "",
    language: "javascript",
    theme: "vs-dark",
    automaticLayout: true,
    minimap: { enabled: window.innerWidth > 768 },
    fontSize: window.innerWidth < 768 ? 14 : 16
  });

  loadSettings();

  editor.onDidChangeCursorPosition(updateStatusBar);
  editor.onDidChangeModelContent(saveCurrentFile);

  if (Object.keys(files).length === 0) {
    createFile("index.html",
`<!DOCTYPE html>
<html>
<head>
  <title>NovaDev Project</title>
</head>
<body>
  <h1>Hello NovaDev 🚀</h1>
</body>
</html>`);
  }

  renderFileList();
  openFile(Object.keys(files)[0]);

});

/* ==============================
   FILE SYSTEM
============================== */

function createFile(name, content = "") {
  if (!name) return;
  files[name] = content;
  saveProject();
  renderFileList();
}

function deleteFile(name) {
  if (!confirm("Delete file?")) return;
  delete files[name];
  saveProject();
  renderFileList();
}

function openFile(name) {
  if (!editor || !files[name]) return;
  currentFile = name;
  editor.setValue(files[name]);
  setLanguage(name);
  renderFileList();
}

function saveCurrentFile() {
  if (!editor || !currentFile) return;
  files[currentFile] = editor.getValue();
  saveProject();
}

function renderFileList() {
  const list = document.getElementById("fileList");
  if (!list) return;

  list.innerHTML = "";

  Object.keys(files).forEach(name => {
    const li = document.createElement("li");
    li.textContent = name;
    if (name === currentFile) li.classList.add("active");
    li.onclick = () => openFile(name);
    li.oncontextmenu = (e) => {
      e.preventDefault();
      deleteFile(name);
    };
    list.appendChild(li);
  });
}

function setLanguage(name) {
  if (!editor) return;

  const ext = name.split(".").pop().toLowerCase();
  const map = {
    js: "javascript",
    html: "html",
    css: "css",
    json: "json",
    md: "markdown"
  };

  const language = map[ext] || "plaintext";
  monaco.editor.setModelLanguage(editor.getModel(), language);

  const status = document.getElementById("statusLanguage");
  if (status) status.textContent = language;
}

/* ==============================
   STORAGE
============================== */

function saveProject() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(files));
}

function loadProject() {
  const data = localStorage.getItem(STORAGE_KEY);
  if (data) files = JSON.parse(data);
}

function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

function loadSettings() {
  const data = localStorage.getItem(SETTINGS_KEY);
  if (!data) return;
  applySettings(JSON.parse(data));
}

/* ==============================
   SETTINGS
============================== */

function applySettings(settings) {
  if (!editor) return;

  monaco.editor.setTheme(settings.theme || "vs-dark");

  editor.updateOptions({
    fontSize: settings.fontSize || 14,
    tabSize: settings.tabSize || 2,
    wordWrap: settings.wordWrap ? "on" : "off",
    minimap: { enabled: settings.minimap },
    lineNumbers: settings.lineNumbers ? "on" : "off"
  });
}

/* ==============================
   TERMINAL
============================== */

function runCommand(cmd) {
  const output = document.getElementById("terminalOutput");
  if (!output) return;

  const [base, ...args] = cmd.split(" ");

  switch (base) {
    case "help":
      output.innerHTML += "help, ls, cat <file>, pwd, clear, echo <text><br>";
      break;
    case "ls":
      output.innerHTML += Object.keys(files).join("<br>") + "<br>";
      break;
    case "cat":
      output.innerHTML += (files[args[0]] || "File not found") + "<br>";
      break;
    case "pwd":
      output.innerHTML += "/project<br>";
      break;
    case "clear":
      output.innerHTML = "";
      break;
    case "echo":
      output.innerHTML += args.join(" ") + "<br>";
      break;
    default:
      output.innerHTML += "Command not found<br>";
  }

  output.scrollTop = output.scrollHeight;
}

/* ==============================
   UI SETUP (Now Always Runs)
============================== */

function showPanel(panelId) {
  document.querySelectorAll(".panel").forEach(p => p.classList.remove("active"));
  const panel = document.getElementById(panelId);
  if (panel) panel.classList.add("active");
  document.getElementById("sidebar").classList.add("open");
}

function setupUI() {

  const explorerBtn = document.getElementById("toggleSidebar");
  const searchBtn = document.getElementById("openSearch");
  const gitBtn = document.getElementById("openGit");
  const settingsBtn = document.getElementById("openSettings");
  const terminalBtn = document.getElementById("openTerminal");

  if (explorerBtn) explorerBtn.onclick = () => showPanel("explorerPanel");
  if (searchBtn) searchBtn.onclick = () => showPanel("searchPanel");
  if (gitBtn) gitBtn.onclick = () => showPanel("gitPanel");
  if (settingsBtn) settingsBtn.onclick = () => showPanel("settingsPanel");

  if (terminalBtn) {
    terminalBtn.onclick = () => {
      document.getElementById("terminal").classList.toggle("open");
    };
  }

  const terminalInput = document.getElementById("terminalInput");
  if (terminalInput) {
    terminalInput.addEventListener("keydown", e => {
      if (e.key === "Enter") {
        runCommand(e.target.value);
        e.target.value = "";
      }
    });
  }
}

/* ==============================
   STATUS BAR
============================== */

function updateStatusBar() {
  if (!editor) return;
  const pos = editor.getPosition();
  document.getElementById("statusPosition").textContent =
    `Ln ${pos.lineNumber}, Col ${pos.column}`;
}

/* ==============================
   SHORTCUTS
============================== */

function setupShortcuts() {
  window.addEventListener("keydown", e => {

    if ((e.ctrlKey || e.metaKey) && e.key === "s") {
      e.preventDefault();
      saveProject();
    }

    if ((e.ctrlKey || e.metaKey) && e.key === "b") {
      e.preventDefault();
      document.getElementById("sidebar").classList.toggle("open");
    }

    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "p") {
      e.preventDefault();
      const cmd = prompt("Command (type 'export'):");
      if (cmd === "export") exportProject();
    }
  });
}
