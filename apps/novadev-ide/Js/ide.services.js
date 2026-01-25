/* ide.services.js */
(() => {
  'use strict';

  function runBasicChecks() {
    const state = NovaIDE.state;
    const file = state.currentTab;
    if (!file || !state.editor) return;

    const model = state.editor.getModel();
    if (!model) return;

    const text = model.getValue();
    const problems = [];

    text.split('\n').forEach((line, i) => {
      if (line.includes('console.log')) {
        problems.push({
          file,
          line: i + 1,
          column: 1,
          message: 'Avoid console.log in production',
          severity: 'warning'
        });
      }

      if (line.trim().endsWith('{') && !line.includes('function')) {
        problems.push({
          file,
          line: i + 1,
          column: 1,
          message: 'Possible missing closing brace',
          severity: 'info'
        });
      }
    });

    NovaIDE.core.setProblems(problems);
  }

  NovaIDE.services = {
    runBasicChecks
  };
})();
