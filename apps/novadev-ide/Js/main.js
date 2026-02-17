/* ==============================
   NovaDev IDE - Mobile Optimized
============================== */

const STORAGE_KEY = "novadev_ide_project_v1";
const SETTINGS_KEY = "novadev_ide_settings_v1";

let editor;
let files = {};
let currentFile = null;
let gitInitialized = false;
let gitHistory = [];

/* ==============================
   MONACO LOAD
============================== */

require.config({
  paths: { vs: "https://unpkg.com/monaco-editor@0.44.0/min/vs" }
});

require(["vs/editor/editor.main"], function () {

  loadProject();

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

  setupUI();
  setupShortcuts();
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

  if (currentFile === name) {
    currentFile = null;
    const remaining = Object.keys(files);
    if (remaining.length) openFile(remaining[0]);
  }

  saveProject();
  renderFileList();
}

function openFile(name) {
  if (!files[name]) return;

  currentFile = name;
  editor.setValue(files[name]);
  setLanguage(name);
  renderFileList();
}

function saveCurrentFile() {
  if (!currentFile) return;
  files[currentFile] = editor.getValue();
  saveProject();
}

function renderFileList() {
  const list = document.getElementById("fileList");
  list.innerHTML = "";

  Object.keys(files).forEach(name => {
    const li = document.createElement("li");
    li.textContent = name;

    if (name === currentFile) {
      li.classList.add("active");
    }

    li.onclick = () => openFile(name);

    li.oncontextmenu = (e) => {
      e.preventDefault();
      deleteFile(name);
    };

    list.appendChild(li);
  });
}

function setLanguage(name) {
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
  document.getElementById("statusLanguage").textContent = language;
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

  const settings = JSON.parse(data);
  applySettings(settings);
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
   SEARCH
============================== */

function searchFiles(query) {
  const resultsContainer = document.getElementById("searchResults");
  resultsContainer.innerHTML = "";

  if (!query) return;

  Object.keys(files).forEach(file => {
    const lines = files[file].split("\n");

    lines.forEach((line, index) => {
      if (line.toLowerCase().includes(query.toLowerCase())) {
        const div = document.createElement("div");
        div.textContent = `${file} (Ln ${index + 1})`;
        div.onclick = () => {
          openFile(file);
          editor.setPosition({ lineNumber: index + 1, column: 1 });
          editor.focus();
        };
        resultsContainer.appendChild(div);
      }
    });
  });
}

/* ==============================
   TERMINAL
============================== */

function runCommand(cmd) {
  const output = document.getElementById("terminalOutput");

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
   EXPORT
============================== */

function exportProject() {
  const html = files["index.html"] || "";
  const css = `<style>${files["style.css"] || ""}</style>`;
  const js = `<script>${files["main.js"] || ""}<\/script>`;

  const final = html
    .replace("</head>", css + "</head>")
    .replace("</body>", js + "</body>");

  const blob = new Blob([final], { type: "text/html" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "novadev_export.html";
  a.click();
}

/* ==============================
   UI
============================== */

function showPanel(panelId) {
  document.querySelectorAll(".panel").forEach(p => p.classList.remove("active"));
  document.getElementById(panelId).classList.add("active");
  document.getElementById("sidebar").classList.add("open");
}

function setupUI() {

  document.getElementById("toggleSidebar").onclick = () => showPanel("explorerPanel");
  document.getElementById("openSearch").onclick = () => showPanel("searchPanel");
  document.getElementById("openGit").onclick = () => showPanel("gitPanel");
  document.getElementById("openSettings").onclick = () => showPanel("settingsPanel");

  document.getElementById("openTerminal").onclick = () => {
    document.getElementById("terminal").classList.toggle("open");
  };

  document.getElementById("newFileBtn").onclick = () => {
    const name = prompt("File name?");
    if (name) createFile(name);
  };

  document.getElementById("searchInput").addEventListener("input", e => {
    searchFiles(e.target.value);
  });

  document.getElementById("terminalInput").addEventListener("keydown", e => {
    if (e.key === "Enter") {
      runCommand(e.target.value);
      e.target.value = "";
    }
  });

  window.addEventListener("resize", () => {
    if (editor) editor.layout();
  });
}

/* ==============================
   STATUS BAR
============================== */

function updateStatusBar() {
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
