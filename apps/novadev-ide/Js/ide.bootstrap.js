/* ide.bootstrap.js */
(() => {
  'use strict';

  if (window.NovaIDE) return;

  window.NovaIDE = {
    state: {},
    core: null,
    services: {},
    panels: {},
    ready: false
  };

  function boot() {
    if (!window.monaco || !NovaIDE.core?.init) {
      requestAnimationFrame(boot);
      return;
    }

    NovaIDE.core.init();
    NovaIDE.panels?.init?.();
    NovaIDE.ready = true;

    console.log('[NovaIDE] Bootstrap complete');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
