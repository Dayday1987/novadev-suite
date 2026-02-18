// ide.fs.js
// Hierarchical Virtual File System (IndexedDB)

const DB_NAME = "novadev_fs";
const DB_VERSION = 2;
const STORE_NAME = "entries";

let db = null;

/*
Entry structure:
{
  path: "src/app.js",
  type: "file" | "folder",
  content: string | null
}
*/

/* ==============================
   Init Database
============================== */

export function initFS() {
  return new Promise((resolve, reject) => {

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "path" });
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
   Helpers
============================== */

function normalize(path) {
  return path.replace(/^\/+/, "").replace(/\/+$/, "");
}

/* ==============================
   Create Folder
============================== */

export function mkdir(path) {
  path = normalize(path);

  return new Promise((resolve, reject) => {

    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);

    store.put({
      path,
      type: "folder",
      content: null
    });

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/* ==============================
   Write File
============================== */

export function writeFile(path, content) {
  path = normalize(path);

  return new Promise((resolve, reject) => {

    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);

    store.put({
      path,
      type: "file",
      content
    });

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/* ==============================
   Read File
============================== */

export function readFile(path) {
  path = normalize(path);

  return new Promise((resolve, reject) => {

    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);

    const request = store.get(path);

    request.onsuccess = () => {
      if (!request.result) {
        resolve(null);
      } else {
        resolve(request.result.content);
      }
    };

    request.onerror = () => reject(request.error);
  });
}

/* ==============================
   Delete Entry
============================== */

export function remove(path) {
  path = normalize(path);

  return new Promise((resolve, reject) => {

    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);

    store.delete(path);

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/* ==============================
   List All Entries
============================== */

export function listAll() {
  return new Promise((resolve, reject) => {

    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);

    const request = store.getAll();

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => reject(request.error);
  });
}

/* ==============================
   List Directory
============================== */

export async function listDir(path = "") {

  path = normalize(path);

  const entries = await listAll();

  const prefix = path ? path + "/" : "";

  return entries.filter(entry => {

    if (!entry.path.startsWith(prefix)) return false;

    const remainder = entry.path.slice(prefix.length);

    return !remainder.includes("/");

  });
}
