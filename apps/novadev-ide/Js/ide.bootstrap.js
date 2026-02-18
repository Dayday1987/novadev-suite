import {
  initFS,
  listProjects,
  createProject,
  writeFile
} from "./ide.fs.js";

import { initEditor } from "./ide.core.js";
import { initPanels } from "./ide.panels.js";
import { state } from "./ide.state.js";

let ideStarted = false;

export async function bootstrapApp() {

  document.addEventListener("DOMContentLoaded", async () => {

    await initFS();

    await renderProjectLauncher();

  });

}

/* =====================================
   Project Launcher
===================================== */

async function renderProjectLauncher() {

  const launcher = document.getElementById("projectLauncher");
  const ideContainer = document.getElementById("ideContainer");
  const projectList = document.getElementById("projectList");
  const newProjectBtn = document.getElementById("newProjectBtn");

  if (!launcher || !projectList) return;

  launcher.classList.remove("hidden");

  if (ideContainer) {
    ideContainer.classList.add("hidden");
  }

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

  if (newProjectBtn) {
    newProjectBtn.onclick = async () => {

      const name = prompt("Project name:");
      if (!name) return;

      const id = await createProject(name);

      await createStarterProject(id);

      await openProject(id);
    };
  }
}

/* =====================================
   Open Project
===================================== */

async function openProject(projectId) {

  state.currentProjectId = projectId;

  const launcher = document.getElementById("projectLauncher");
  const ideContainer = document.getElementById("ideContainer");

  if (launcher) launcher.classList.add("hidden");
  if (ideContainer) ideContainer.classList.remove("hidden");

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
   Start IDE Properly
===================================== */

async function startIDE() {

  if (ideStarted) return;
  ideStarted = true;

  // Initialize UI first (buttons, explorer, etc.)
  initPanels();

  // Then load Monaco
  await initEditor();
}
