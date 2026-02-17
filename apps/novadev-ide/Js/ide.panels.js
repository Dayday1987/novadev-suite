export function initPanels() {

  const sidebar = document.getElementById("sidebar");

  function showPanel(panelId) {
    document.querySelectorAll(".panel").forEach(p =>
      p.classList.remove("active")
    );

    const panel = document.getElementById(panelId);
    if (panel) panel.classList.add("active");

    sidebar.classList.add("open");
  }

  document.getElementById("toggleSidebar")
    ?.addEventListener("click", () => showPanel("explorerPanel"));

  document.getElementById("openSearch")
    ?.addEventListener("click", () => showPanel("searchPanel"));

  document.getElementById("openGit")
    ?.addEventListener("click", () => showPanel("gitPanel"));

  document.getElementById("openSettings")
    ?.addEventListener("click", () => showPanel("settingsPanel"));

  document.getElementById("openTerminal")
    ?.addEventListener("click", () => {
      document.getElementById("terminal")
        ?.classList.toggle("open");
    });

}
