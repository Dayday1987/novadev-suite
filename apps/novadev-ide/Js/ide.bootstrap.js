import { initFS, listProjects, createProject, listEntries, writeFile } from './ide.fs.js';
import { initEditor } from './ide.core.js';
import { initPanels } from './ide.panels.js';
import { state } from './ide.state.js';

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
      state.currentProjectId = project.id;
      launcher.classList.add("hidden");
      ideContainer.classList.remove("hidden");
      await startIDE();
    };

    projectList.appendChild(div);

  });

  document.getElementById("newProjectBtn").onclick = async () => {

    const name = prompt("Project name:");
    if (!name) return;

    const id = await createProject(name);
    state.currentProjectId = id;

    await createStarterProject(id);

    launcher.classList.add("hidden");
    ideContainer.classList.remove("hidden");

    await startIDE();
  };

}

async function createStarterProject(projectId) {

  await writeFile(projectId, "index.html", "<h1>Hello NovaDev 🚀</h1>");
  await writeFile(projectId, "style.css", "body { font-family: sans-serif; }");
  await writeFile(projectId, "script.js", "console.log('NovaDev ready');");

}

async function startIDE() {
  initPanels();
  await initEditor();
}
