/* ide.services.js */

import { state } from './ide.state.js';

const STORAGE_KEY = "novadev_ide_project_v1";

/* ==============================
   Project Storage
============================== */

export function loadProject() {

  try {
    const data = localStorage.getItem(STORAGE_KEY);

    if (data) {
      state.files = JSON.parse(data);
    } else {
      // Default starter file if none exists
      state.files = {
        "index.html": "<h1>Hello NovaDev 🚀</h1>"
      };
    }

  } catch (err) {
    console.error("Failed to load project:", err);
    state.files = {};
  }

}

export function saveProject() {

  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(state.files)
    );
  } catch (err) {
    console.error("Failed to save project:", err);
  }

}

/* ==============================
   File Management Helpers
============================== */

export function deleteFile(name) {

  if (!state.files[name]) return;

  delete state.files[name];

  if (state.currentFile === name) {
    state.currentFile = null;
  }

  saveProject();
}

export function fileExists(name) {
  return !!state.files[name];
}
