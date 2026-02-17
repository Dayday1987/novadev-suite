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

  function closeSidebar() {
    sidebar.classList.remove("open");
  }

  // Main navigation buttons
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

  // Close button
  document.getElementById("closeSidebar")
    ?.addEventListener("click", closeSidebar);

  // Tap outside to close
  document.addEventListener("click", (e) => {
    if (
      sidebar.classList.contains("open") &&
      !sidebar.contains(e.target) &&
      !e.target.closest("#toggleSidebar") &&
      !e.target.closest("#openSearch") &&
      !e.target.closest("#openGit") &&
      !e.target.closest("#openSettings")
    ) {
      closeSidebar();
    }
  });

  // Swipe to close (mobile)
  let touchStartX = 0;

  sidebar.addEventListener("touchstart", (e) => {
    touchStartX = e.touches[0].clientX;
  });

  sidebar.addEventListener("touchmove", (e) => {
    const deltaX = e.touches[0].clientX - touchStartX;

    if (deltaX < -50) {
      closeSidebar();
    }
  });

}
