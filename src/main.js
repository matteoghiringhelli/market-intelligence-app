import "./style.css";
import "./mobile-app-shell.css";
import "./iphone-tabbar.css";

import { renderDisclaimerBanner } from "./components/disclaimer-banner.js";
import { renderHomeOverviewPage } from "./pages/home-overview.js";
import { renderDashboard } from "./pages/dashboard.js";
import { renderSecurityDetail } from "./pages/security-detail.js";
import { renderRealDataTestPage } from "./pages/real-data-test.js";
import { renderPeerComparePage } from "./pages/peer-compare.js";
import { renderTechnicalPatternsPage } from "./pages/technical-patterns.js";
import { renderInterpretationGuidePage } from "./pages/interpretation-guide.js";
import { renderCongressDisclosuresPage } from "./pages/congress-disclosures.js";
import { renderDataQualityPanelPage } from "./pages/data-quality-panel.js";
import { mockSecurities } from "./data/mock-securities.js";

const appRoot = document.querySelector("#app");

const NAV_ITEMS = [
  {
    view: "home-overview",
    icon: "⌂",
    label: "Oggi"
  },
  {
    view: "security-detail",
    icon: "⌕",
    label: "Titoli"
  },
  {
    view: "peer-compare",
    icon: "◇",
    label: "Peer"
  },
  {
    view: "congress-disclosures",
    icon: "◎",
    label: "Congress"
  },
  {
    view: "data-quality-panel",
    icon: "✓",
    label: "Qualità"
  }
];

let currentView = normalizeView(window.location.hash.replace("#", ""));
let selectedSecurity =
  mockSecurities && mockSecurities.length
    ? mockSecurities[0]
    : {
        symbol: "AAPL",
        ticker: "AAPL",
        name: "Apple Inc."
      };

function renderApp(view = currentView) {
  currentView = normalizeView(view);

  if (!appRoot) {
    return;
  }

  appRoot.innerHTML = `
    ${renderDisclaimerBannerSafe()}
    <main class="app-screen">
      ${renderCurrentPage(currentView)}
    </main>
    ${renderIphoneTabbar(currentView)}
  `;

  attachTabbarListeners();
  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

function renderCurrentPage(view) {
  if (view === "home-overview") {
    return renderHomeOverviewPage();
  }

  if (view === "dashboard") {
    return renderDashboard();
  }

  if (view === "security-detail") {
    return renderSecurityDetail(selectedSecurity);
  }

  if (view === "real-data-test") {
    return renderRealDataTestPage();
  }

  if (view === "peer-compare") {
    return renderPeerComparePage();
  }

  if (view === "technical-patterns") {
    return renderTechnicalPatternsPage();
  }

  if (view === "interpretation-guide") {
    return renderInterpretationGuidePage();
  }

  if (view === "congress-disclosures") {
    return renderCongressDisclosuresPage();
  }

  if (view === "data-quality-panel") {
    return renderDataQualityPanelPage();
  }

  return renderHomeOverviewPage();
}

function renderDisclaimerBannerSafe() {
  try {
    return renderDisclaimerBanner();
  } catch {
    return "";
  }
}

function renderIphoneTabbar(activeView) {
  const normalizedActiveView = normalizeView(activeView);

  const items = NAV_ITEMS.map((item) => {
    const isActive = item.view === normalizedActiveView;

    return `
      <button
        class="iphone-tabbar__item ${isActive ? "iphone-tabbar__item--active" : ""}"
        type="button"
        data-view="${item.view}"
        aria-label="${escapeHtml(item.label)}"
        ${isActive ? 'aria-current="page"' : ""}
      >
        <span class="iphone-tabbar__icon">${escapeHtml(item.icon)}</span>
        <span class="iphone-tabbar__label">${escapeHtml(item.label)}</span>
      </button>
    `;
  }).join("");

  return `
    <nav class="iphone-tabbar" aria-label="Primary">
      ${items}
    </nav>
  `;
}

function attachTabbarListeners() {
  document.querySelectorAll(".iphone-tabbar__item").forEach((button) => {
    button.addEventListener("click", () => {
      const view = button.dataset.view || "home-overview";
      navigateToView(view);
    });
  });
}

function navigateToView(view) {
  currentView = normalizeView(view);
  history.replaceState(null, "", `#${currentView}`);
  renderApp(currentView);
}

function normalizeView(view) {
  const value = String(view || "").replace(/^#/, "").trim();

  if (!value) {
    return "home-overview";
  }

  if (value === "dashboard") {
    return "home-overview";
  }

  if (value === "quality") {
    return "data-quality-panel";
  }

  if (value === "congress") {
    return "congress-disclosures";
  }

  if (value === "titoli" || value === "symbols" || value === "ticker") {
    return "security-detail";
  }

  return value;
}

function resolveSecurity(symbol) {
  const normalizedSymbol = String(symbol || "").trim().toUpperCase();

  const foundSecurity = (mockSecurities || []).find((security) => {
    return (
      security.symbol === normalizedSymbol ||
      security.ticker === normalizedSymbol
    );
  });

  return (
    foundSecurity || {
      symbol: normalizedSymbol || "AAPL",
      ticker: normalizedSymbol || "AAPL",
      name: normalizedSymbol || "Apple Inc."
    }
  );
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

window.openIphoneTab = navigateToView;
window.setCurrentView = navigateToView;
window.setActiveView = navigateToView;
window.navigateToView = navigateToView;

window.openSecurityDetail = function openSecurityDetail(symbol) {
  selectedSecurity = resolveSecurity(symbol);
  navigateToView("security-detail");
};

window.addEventListener("hashchange", () => {
  const hashView = window.location.hash.replace("#", "");

  if (hashView && normalizeView(hashView) !== currentView) {
    renderApp(hashView);
  }
});

renderApp(currentView);
