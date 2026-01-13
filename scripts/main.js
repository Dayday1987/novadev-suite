alert('MAIN.JS LOADED');
import { initUI } from './ui.js';
import { initMemeMaker } from './meme.js';
import { initPromptLibrary } from './prompts.js';
import { initComments } from './comments.js';
import { initContactForms } from './contact.js';
import { initEditor } from './editor-embed.js';  // FIXED: Changed from './editor.js'

document.addEventListener('DOMContentLoaded', () => {
  initUI();
  initMemeMaker();
  initPromptLibrary();
  initComments();
  initContactForms();
  initEditor();
});
