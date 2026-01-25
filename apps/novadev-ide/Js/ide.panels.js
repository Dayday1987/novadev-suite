(() => {
  'use strict';

  NovaIDE.panels = {
    init() {
      this.renderProblems();
    },

    renderProblems() {
      const container = document.getElementById('problemsContent');
      if (!container) return;

      const problems = NovaIDE.core.getProblems();

      container.innerHTML = '';

      if (!problems.length) {
        container.textContent = 'No problems detected';
        return;
      }

      problems.forEach(p => {
        const row = document.createElement('div');
        row.className = `problem-row ${p.severity}`;

        row.innerHTML = `
          <div class="problem-main">
            <span class="problem-icon">${icon(p.severity)}</span>
            <span class="problem-message">${p.message}</span>
          </div>
          <div class="problem-meta">
            ${p.file}:${p.line}
          </div>
        `;

        row.addEventListener('click', () => {
          NovaIDE.core.openFile(p.file);
          NovaIDE.state.editor.setPosition({
            lineNumber: p.line,
            column: p.column || 1
          });
          NovaIDE.state.editor.revealLineInCenter(p.line);
        });

        container.appendChild(row);
      });
    }
  };

  function icon(severity) {
    if (severity === 'error') return '⛔';
    if (severity === 'warning') return '⚠️';
    return 'ℹ️';
  }
})();
