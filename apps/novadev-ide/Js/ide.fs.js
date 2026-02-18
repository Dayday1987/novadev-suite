// ide.fs.js
// Virtual File System using IndexedDB

const DB_NAME = "novadev_fs";
const DB_VERSION = 1;
const STORE_NAME = "files";

let db = null;

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
   File Operations
============================== */

export function writeFile(path, content) {
  return new Promise((resolve, reject) => {

    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);

    store.put({ path, content });

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export function readFile(path) {
  return new Promise((resolve, reject) => {

    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);

    const request = store.get(path);

    request.onsuccess = () => {
      resolve(request.result ? request.result.content : null);
    };

    request.onerror = () => reject(request.error);
  });
}

export function deleteFile(path) {
  return new Promise((resolve, reject) => {

    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);

    store.delete(path);

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export function listFiles() {
  return new Promise((resolve, reject) => {

    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);

    const request = store.getAll();

    request.onsuccess = () => {
      resolve(request.result.map(f => f.path));
    };

    request.onerror = () => reject(request.error);
  });
}
