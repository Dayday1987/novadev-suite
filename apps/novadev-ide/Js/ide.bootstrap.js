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
(function fixIOSViewport() {
  if (!window.visualViewport) return;

  const apply = () => {
    const w = window.visualViewport.width;
    document.documentElement.style.width = w + 'px';
    document.body.style.width = w + 'px';
  };

  apply();
  window.visualViewport.addEventListener('resize', apply);
})();
