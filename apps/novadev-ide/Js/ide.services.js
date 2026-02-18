/* ide.services.js */
import { state } from "./ide.state.js";

const STORAGE_KEY = "novadev_ide_project_v1";
const SETTINGS_KEY = "novadev_ide_settings_v1";

/* ==============================
   Project Storage
============================== */

export function loadProject() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);

    if (data) {
      state.files = JSON.parse(data);
    } else {
      state.files = {
        "index.html": "<h1>Hello NovaDev 🚀</h1>",
      };
    }
  } catch (err) {
    console.error("Failed to load project:", err);
    state.files = {};
  }
}

export function saveProject() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.files));
}

/* ==============================
   Settings
============================== */

export function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function loadSettings() {
  const data = localStorage.getItem(SETTINGS_KEY);
  return data ? JSON.parse(data) : null;
}
