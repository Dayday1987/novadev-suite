// main.js - Emergency fix version

// FIRST: Make sure all content is visible immediately
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 Emergency init starting...');
  
  // CRITICAL: Force all hidden content to show
  document.querySelectorAll('.reveal, .fade-in, .hero-intro-item').forEach(el => {
    el.classList.add('is-visible', 'intro-visible');
    el.style.opacity = '1';
    el.style.transform = 'none';
  });
  
  console.log('✅ All content forced visible');
  
  // Now try to load modules one by one with error protection
  loadModuleSafely();
});

async function loadModuleSafely() {
  // UI First (hamburger, clock, reveal animations)
  try {
    const { initUI } = await import('./ui.js');
    initUI();
    console.log('✅ UI loaded');
  } catch (error) {
    console.error('❌ UI failed:', error);
  }
  
  // Comments
  try {
    const { initComments } = await import('./comments.js');
    initComments();
    console.log('✅ Comments loaded');
  } catch (error) {
    console.error('❌ Comments failed:', error);
  }
  
  // Contact Forms
  try {
    const { initContactForms } = await import('./contact.js');
    initContactForms();
    console.log('✅ Contact forms loaded');
  } catch (error) {
    console.error('❌ Contact forms failed:', error);
  }
  
  // Meme Maker (only if canvas exists)
  if (document.getElementById('memeCanvas')) {
    try {
      const { initMemeMaker } = await import('./meme.js');
      initMemeMaker();
      console.log('✅ Meme Maker loaded');
    } catch (error) {
      console.error('❌ Meme Maker failed:', error);
    }
  }
  
  // Prompt Library (only if input exists)
  if (document.getElementById('promptInput')) {
    try {
      const { initPromptLibrary } = await import('./prompts.js');
      initPromptLibrary();
      console.log('✅ Prompt Library loaded');
    } catch (error) {
      console.error('❌ Prompt Library failed:', error);
    }
  }
  
  // Editor (only if container exists)
  if (document.getElementById('editorContainer')) {
    try {
      const { initEditor } = await import('./editor-embed.js');
      initEditor();
      console.log('✅ Editor loaded');
    } catch (error) {
      console.error('❌ Editor failed:', error);
    }
  }
  
  console.log('✨ All modules attempted!');
}
