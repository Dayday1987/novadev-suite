export const state = {
  editor: null,
  files: {},
  currentFile: null,
  models: {}, // Monaco models per file
  openTabs: [], // Open file tabs
  git: {
    initialized: false,
    history: [],
  },
};
