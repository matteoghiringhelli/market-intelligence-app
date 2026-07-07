const NAV_ITEMS = [
  ["dashboard", "⌂", "Oggi"],
  ["security-detail", "⌕", "Titoli"],
  ["peer-compare", "◇", "Peer"],
  ["congress-disclosures", "◎", "Congress"],
  ["data-quality-panel", "✓", "Qualità"]
];

function ensureIphoneTabbar() {
  if (document.querySelector(".iphone-tabbar")) {
    return;
  }

  const nav = document.createElement("nav");
  nav.className = "iphone-tabbar";
  nav.setAttribute("aria-label", "Primary");

  nav.innerHTML = NAV_ITEMS.map(([view, icon, label], index) => {
    return `
      <button
        class="iphone-tabbar__item ${index === 0 ? "iphone-tabbar__item--active" : ""}"
        type="button"
        data-view="${view}"
      >
        <span class="iphone-tabbar__icon">${icon}</span>
        <span class="iphone-tabbar__label">${label}</span>
      </button>
    `;
  }).join("");

  nav.addEventListener("click", (event) => {
    const button = event.target.closest(".iphone-tabbar__item");

    if (!button) {
      return;
    }

    const view = button.dataset.view;

    document.querySelectorAll(".iphone-tabbar__item").forEach((item) => {
      item.classList.toggle("iphone-tabbar__item--active", item === button);
    });

    if (typeof window.openIphoneTab === "function") {
      window.openIphoneTab(view);
      return;
    }

    if (typeof window.setCurrentView === "function") {
      window.setCurrentView(view);
      return;
    }

    if (typeof window.setActiveView === "function") {
      window.setActiveView(view);
      return;
    }

    if (typeof window.navigateToView === "function") {
      window.navigateToView(view);
      return;
    }

    if (typeof window.renderView === "function") {
      window.renderView(view);
      return;
    }

    window.location.hash = view;
    window.dispatchEvent(
      new CustomEvent("app:navigate", {
        detail: {
          view
        }
      })
    );
  });

  document.body.appendChild(nav);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", ensureIphoneTabbar);
} else {
  ensureIphoneTabbar();
}

window.addEventListener("app:rendered", ensureIphoneTabbar);
setTimeout(ensureIphoneTabbar, 250);
