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
      if (NovaIDE.core?.init) {
        NovaIDE.core.init();
        NovaIDE.ready = true;
        console.log('[NovaIDE] Bootstrap complete');
      } else {
        console.error('[NovaIDE] core.init not found');
      }
    });
  });
})();
