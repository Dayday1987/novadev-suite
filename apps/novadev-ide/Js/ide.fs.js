// ide.fs.js
// Multi-project Virtual File System

const DB_NAME = "novadev_fs";
const DB_VERSION = 3;

const PROJECT_STORE = "projects";
const ENTRY_STORE = "entries";

let db = null;

/* ==============================
   Init DB
============================== */

export function initFS() {
  return new Promise((resolve, reject) => {

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains(PROJECT_STORE)) {
        db.createObjectStore(PROJECT_STORE, { keyPath: "id" });
      }

      if (!db.objectStoreNames.contains(ENTRY_STORE)) {
        const store = db.createObjectStore(ENTRY_STORE, {
          keyPath: ["projectId", "path"]
        });
      }
    };

    request.onsuccess = (event) => {
      db = event.target.result;
      resolve();
    };

    request.onerror = () => reject(request.error);
  });
}

/* ==============================
   Utilities
============================== */

function normalize(path) {
  return path.replace(/^\/+/, "").replace(/\/+$/, "");
}

function uuid() {
  return crypto.randomUUID();
}

/* ==============================
   Project Management
============================== */

export function createProject(name) {
  const id = uuid();

  return new Promise((resolve, reject) => {

    const tx = db.transaction(PROJECT_STORE, "readwrite");
    const store = tx.objectStore(PROJECT_STORE);

    store.put({
      id,
      name,
      createdAt: Date.now()
    });

    tx.oncomplete = () => resolve(id);
    tx.onerror = () => reject(tx.error);
  });
}

export function listProjects() {
  return new Promise((resolve, reject) => {

    const tx = db.transaction(PROJECT_STORE, "readonly");
    const store = tx.objectStore(PROJECT_STORE);

    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function deleteProject(projectId) {
  return new Promise((resolve, reject) => {

    const tx = db.transaction(
      [PROJECT_STORE, ENTRY_STORE],
      "readwrite"
    );

    tx.objectStore(PROJECT_STORE).delete(projectId);

    const entryStore = tx.objectStore(ENTRY_STORE);
    const request = entryStore.openCursor();

    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        if (cursor.value.projectId === projectId) {
          cursor.delete();
        }
        cursor.continue();
      }
    };

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/* ==============================
   File / Folder Operations
============================== */

export function writeFile(projectId, path, content) {
  path = normalize(path);

  return new Promise((resolve, reject) => {

    const tx = db.transaction(ENTRY_STORE, "readwrite");
    const store = tx.objectStore(ENTRY_STORE);

    store.put({
      projectId,
      path,
      type: "file",
      content
    });

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export function mkdir(projectId, path) {
  path = normalize(path);

  return new Promise((resolve, reject) => {

    const tx = db.transaction(ENTRY_STORE, "readwrite");
    const store = tx.objectStore(ENTRY_STORE);

    store.put({
      projectId,
      path,
      type: "folder",
      content: null
    });

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export function readFile(projectId, path) {
  path = normalize(path);

  return new Promise((resolve, reject) => {

    const tx = db.transaction(ENTRY_STORE, "readonly");
    const store = tx.objectStore(ENTRY_STORE);

    const request = store.get([projectId, path]);

    request.onsuccess = () => {
      resolve(request.result ? request.result.content : null);
    };

    request.onerror = () => reject(request.error);
  });
}

export function listEntries(projectId) {
  return new Promise((resolve, reject) => {

    const tx = db.transaction(ENTRY_STORE, "readonly");
    const store = tx.objectStore(ENTRY_STORE);

    const request = store.getAll();

    request.onsuccess = () => {
      resolve(
        request.result.filter(e => e.projectId === projectId)
      );
    };

    request.onerror = () => reject(request.error);
  });
}

/* ==============================
   Delete File
============================== */

export async function deleteFile(projectId, path) {

  const db = await getDB();

  return new Promise((resolve, reject) => {

    const tx = db.transaction("files", "readwrite");
    const store = tx.objectStore("files");

    const request = store.delete([projectId, path]);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/* ==============================
   Delete Folder (Recursive)
============================== */

export async function deleteFolder(projectId, folderPath) {

  const entries = await listEntries(projectId);

  const targets = entries.filter(e =>
    e.path.startsWith(folderPath + "/")
  );

  for (const entry of targets) {
    await deleteFile(projectId, entry.path);
  }

  // delete the folder entry itself if stored
  await deleteFile(projectId, folderPath);
}
