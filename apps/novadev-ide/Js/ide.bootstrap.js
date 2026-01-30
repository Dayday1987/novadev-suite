/* ide.bootstrap.js */
(() => {
  'use strict';

  if (window.NovaIDE) return;

  window.NovaIDE = {
    state: {},
    core: {},
    services: {},
    panels: {},
    ready: false
  };

  document.addEventListener('DOMContentLoaded', () => {
    require(['vs/editor/editor.main'], () => {
  const waitForCore = () => {
    if (NovaIDE.core && typeof NovaIDE.core.init === 'function') {
      NovaIDE.core.init();
      NovaIDE.ready = true;
      NovaIDE.panels?.init();
      console.log('[NovaIDE] Bootstrap complete');
    } else {
      requestAnimationFrame(waitForCore);
    }
  };

  waitForCore();
});
  });
})();
