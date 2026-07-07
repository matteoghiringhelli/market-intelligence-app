const NAV_ITEMS = [
  {
    id: "dashboard",
    label: "Oggi",
    icon: "⌂",
    view: "dashboard"
  },
  {
    id: "security-detail",
    label: "Titoli",
    icon: "⌕",
    view: "security-detail"
  },
  {
    id: "peer-compare",
    label: "Peer",
    icon: "◇",
    view: "peer-compare"
  },
  {
    id: "congress-disclosures",
    label: "Congress",
    icon: "◎",
    view: "congress-disclosures"
  },
  {
    id: "data-quality-panel",
    label: "Qualità",
    icon: "✓",
    view: "data-quality-panel"
  }
];

export function renderAppNav(activeView = "dashboard") {
  const normalizedActiveView = String(activeView || "dashboard");

  const items = NAV_ITEMS.map((item) => {
    const isActive =
      normalizedActiveView === item.view ||
      normalizedActiveView === item.id;

    return `
      <button
        class="iphone-tabbar__item ${isActive ? "iphone-tabbar__item--active" : ""}"
        type="button"
        data-view="${item.view}"
        onclick="openIphoneTab('${item.view}')"
        aria-label="${item.label}"
        ${isActive ? 'aria-current="page"' : ""}
      >
        <span class="iphone-tabbar__icon">${item.icon}</span>
        <span class="iphone-tabbar__label">${item.label}</span>
      </button>
    `;
  }).join("");

  return `
    <nav class="iphone-tabbar" aria-label="Primary">
      ${items}
    </nav>
  `;
}

export const renderNavigation = renderAppNav;
export const renderNav = renderAppNav;
export const renderBottomNav = renderAppNav;

if (typeof window !== "undefined" && !window.openIphoneTab) {
  window.openIphoneTab = function openIphoneTab(view) {
    const normalizedView = String(view || "dashboard");

    if (typeof window.setCurrentView === "function") {
      window.setCurrentView(normalizedView);
      return;
    }

    if (typeof window.setActiveView === "function") {
      window.setActiveView(normalizedView);
      return;
    }

    if (typeof window.navigateToView === "function") {
      window.navigateToView(normalizedView);
      return;
    }

    if (typeof window.renderView === "function") {
      window.renderView(normalizedView);
      return;
    }

    window.location.hash = normalizedView;
    window.dispatchEvent(
      new CustomEvent("app:navigate", {
        detail: {
          view: normalizedView
        }
      })
    );
  };
}
