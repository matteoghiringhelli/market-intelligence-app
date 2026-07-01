export function renderAppNav(currentView) {
  const items = [
    {
      id: "dashboard",
      label: "Dashboard"
    },
    {
      id: "peer-compare",
      label: "Peer Compare"
    },
    {
      id: "technical-patterns",
      label: "Technical Patterns"
    },
    {
      id: "data-quality",
      label: "Data Quality"
    }
  ];

  const navItems = items
    .map((item) => {
      const activeClass = currentView === item.id ? "app-nav__button--active" : "";

      return `
        <button
          class="app-nav__button ${activeClass}"
          type="button"
          onclick="navigateTo('${item.id}')"
        >
          ${item.label}
        </button>
      `;
    })
    .join("");

  return `
    <nav class="app-nav" aria-label="Navigazione principale">
      ${navItems}
    </nav>
  `;
}