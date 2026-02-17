/* ide.services.js */
const STORAGE_KEY = "novadev_ide_project_v1";

let files = {};

export function loadProject() {
  const data = localStorage.getItem(STORAGE_KEY);
  if (data) files = JSON.parse(data);
}

export function saveProject() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(files));
}
