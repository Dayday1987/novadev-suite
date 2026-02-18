import { initFS, listProjects, createProject } from './ide.fs.js';
import { initEditor } from './ide.core.js';
import { initPanels } from './ide.panels.js';

let currentProjectId = null;

export async function bootstrapApp() {

  document.addEventListener("DOMContentLoaded", async () => {

    await initFS();

    renderProjectLauncher();

  });

}

async function renderProjectLauncher() {

  const launcher = document.getElementById("projectLauncher");
  const projectList = document.getElementById("projectList");
  const ideContainer = document.getElementById("ideContainer");

  const projects = await listProjects();

  projectList.innerHTML = "";

  projects.forEach(project => {

    const div = document.createElement("div");
    div.className = "project-item";
    div.textContent = project.name;

    div.onclick = async () => {
      currentProjectId = project.id;
      launcher.classList.add("hidden");
      ideContainer.classList.remove("hidden");
      startIDE();
    };

    projectList.appendChild(div);

  });

  document.getElementById("newProjectBtn").onclick = async () => {

    const name = prompt("Project name:");
    if (!name) return;

    const id = await createProject(name);
    currentProjectId = id;

    launcher.classList.add("hidden");
    ideContainer.classList.remove("hidden");

    startIDE();
  };

}

async function startIDE() {
  initPanels();
  await initEditor();
}
