import {
  initFS,
  listProjects,
  createProject,
  writeFile
} from "./ide.fs.js";

import { initEditor } from "./ide.core.js";
import { initPanels } from "./ide.panels.js";
import { state } from "./ide.state.js";

import {
  initAuth,
  login,
  signup,
  oauthLogin
} from "./ide.auth.js";

export async function bootstrapApp() {

  document.addEventListener("DOMContentLoaded", async () => {

    await initFS();

    const user = await initAuth();

    if (!user) {
      wireAuthUI();
      return;
    }

    await renderProjectLauncher();
  });
}

/* =====================================
   Wire Auth UI
===================================== */

function wireAuthUI() {

  document.getElementById("loginBtn").onclick = async () => {

    const email = document.getElementById("emailInput").value;
    const password = document.getElementById("passwordInput").value;

    await login(email, password);
  };

  document.getElementById("signupBtn").onclick = async () => {

    const email = document.getElementById("emailInput").value;
    const password = document.getElementById("passwordInput").value;

    await signup(email, password);
  };

  document.getElementById("googleLogin")
    .onclick = () => oauthLogin("google");

  document.getElementById("githubLogin")
    .onclick = () => oauthLogin("github");
}

/* =====================================
   Project Launcher
===================================== */

async function renderProjectLauncher() {

  const launcher = document.getElementById("projectLauncher");
  const projectList = document.getElementById("projectList");
  const newProjectBtn = document.getElementById("newProjectBtn");

  launcher.classList.remove("hidden");
  projectList.innerHTML = "";

  const projects = await listProjects();

  projects.forEach(project => {

    const div = document.createElement("div");
    div.className = "project-item";
    div.textContent = project.name;

    div.onclick = async () => {
      await openProject(project.id);
    };

    projectList.appendChild(div);
  });

  newProjectBtn.onclick = async () => {

    const name = prompt("Project name:");
    if (!name) return;

    const id = await createProject(name);

    await createStarterProject(id);

    await openProject(id);
  };
}

/* =====================================
   Open Project
===================================== */

async function openProject(projectId) {

  state.currentProjectId = projectId;

  document.getElementById("projectLauncher")
    .classList.add("hidden");

  document.getElementById("ideContainer")
    .classList.remove("hidden");

  await startIDE();
}

/* =====================================
   Starter Template
===================================== */

async function createStarterProject(projectId) {

  await writeFile(projectId, "index.html", "<h1>Hello NovaDev 🚀</h1>");
  await writeFile(projectId, "style.css", "body { font-family: sans-serif; }");
  await writeFile(projectId, "script.js", "console.log('NovaDev ready');");
}

/* =====================================
   Start IDE
===================================== */

async function startIDE() {

  initPanels();
  await initEditor();
}
