function runBasicChecks() {
  const file = NovaIDE.state.currentTab;
  if (!file) return;

  const model = NovaIDE.state.editor.getModel();
  const text = model.getValue();
  const problems = [];

  text.split('\n').forEach((line, i) => {
    if (line.includes('console.log')) {
      problems.push({
        file,
        line: i + 1,
        message: 'Avoid console.log in production',
        severity: 'warning'
      });
    }

    if (line.trim().endsWith('{') && !line.includes('function')) {
      problems.push({
        file,
        line: i + 1,
        message: 'Possible missing closing brace',
        severity: 'info'
      });
    }
  });

  NovaIDE.core.setProblems(problems);
}
