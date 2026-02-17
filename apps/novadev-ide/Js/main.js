const STORAGE_KEY = "novadev_ide_project_v1";
const SETTINGS_KEY = "novadev_ide_settings_v1";

let editor;
let files = {};
let currentFile = null;
let gitInitialized = false;
let gitHistory = [];

require.config({ paths: { vs: "https://unpkg.com/monaco-editor@0.44.0/min/vs" } });

require(["vs/editor/editor.main"], function () {

  loadProject();
  loadSettings();

  editor = monaco.editor.create(document.getElementById("editor"), {
    value: "",
    language: "javascript",
    theme: "vs-dark",
    automaticLayout: true
  });

  editor.onDidChangeCursorPosition(updateStatusBar);
  editor.onDidChangeModelContent(saveCurrentFile);

  if (Object.keys(files).length === 0) {
    createFile("index.html", "<!DOCTYPE html>\n<html>\n<head></head>\n<body>\n</body>\n</html>");
  }

  renderFileList();
  openFile(Object.keys(files)[0]);

  setupUI();
  setupShortcuts();
});

/* ---------------- FILE SYSTEM ---------------- */

function createFile(name, content = "") {
  files[name] = content;
  saveProject();
  renderFileList();
}

function deleteFile(name) {
  if (!confirm("Delete file?")) return;
  delete files[name];
  if (currentFile === name) {
    currentFile = null;
  }
  saveProject();
  renderFileList();
}

function openFile(name) {
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
  const ext = name.split(".").pop();
  const map = {
    js: "javascript",
    html: "html",
    css: "css",
    json: "json",
    md: "markdown"
  };
  monaco.editor.setModelLanguage(editor.getModel(), map[ext] || "plaintext");
  document.getElementById("statusLanguage").textContent = map[ext] || "plaintext";
}

/* ---------------- STORAGE ---------------- */

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
  setEditorSettings(settings);
}

/* ---------------- SETTINGS ---------------- */

function setEditorSettings(settings) {
  monaco.editor.setTheme(settings.theme);
  editor.updateOptions({
    fontSize: settings.fontSize,
    tabSize: settings.tabSize,
    wordWrap: settings.wordWrap ? "on" : "off",
    minimap: { enabled: settings.minimap },
    lineNumbers: settings.lineNumbers ? "on" : "off"
  });
}

/* ---------------- TERMINAL ---------------- */

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

/* ---------------- EXPORT ---------------- */

function exportProject() {
  const html = files["index.html"] || "";
  const css = `<style>${files["style.css"] || ""}</style>`;
  const js = `<script>${files["main.js"] || ""}<\/script>`;

  const blob = new Blob([html.replace("</head>", css + "</head>").replace("</body>", js + "</body>")], { type: "text/html" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "novadev_export.html";
  a.click();
}

/* ---------------- UI ---------------- */

function setupUI() {

  document.getElementById("toggleSidebar").onclick = () =>
    document.getElementById("sidebar").classList.toggle("open");

  document.getElementById("newFileBtn").onclick = () => {
    const name = prompt("File name?");
    if (name) createFile(name);
  };

  document.getElementById("terminalInput").addEventListener("keydown", e => {
    if (e.key === "Enter") {
      runCommand(e.target.value);
      e.target.value = "";
    }
  });

  document.getElementById("openTerminal").onclick = () =>
    document.getElementById("terminal").classList.toggle("hidden");

  document.getElementById("initRepo").onclick = () => {
    gitInitialized = true;
    document.getElementById("gitLog").innerHTML += "Repo initialized<br>";
  };

  document.getElementById("commitBtn").onclick = () => {
    if (!gitInitialized) return alert("Initialize repo first");
    const msg = document.getElementById("commitMessage").value;
    gitHistory.push(msg);
    document.getElementById("gitLog").innerHTML += `Commit: ${msg}<br>`;
  };
}

/* ---------------- STATUS ---------------- */

function updateStatusBar() {
  const pos = editor.getPosition();
  document.getElementById("statusPosition").textContent =
    `Ln ${pos.lineNumber}, Col ${pos.column}`;
}

/* ---------------- SHORTCUTS ---------------- */

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
      const cmd = prompt("Command:");
      if (cmd === "export") exportProject();
    }
  });
}
