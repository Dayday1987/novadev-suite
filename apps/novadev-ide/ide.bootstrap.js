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

  function waitForMonaco(cb) {
    if (window.monaco && window.monaco.editor) {
      cb();
    } else {
      setTimeout(() => waitForMonaco(cb), 50);
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    waitForMonaco(() => {
      if (NovaIDE.core.init) {
        NovaIDE.core.init();
        NovaIDE.ready = true;
        console.log('[NovaIDE] Bootstrap complete');
      } else {
        console.error('[NovaIDE] core.init not found');
      }
    });
  });
})();
