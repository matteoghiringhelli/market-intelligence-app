import "./style.css";
import { renderDisclaimerBanner } from "./components/disclaimer-banner.js";
import { renderAppNav } from "./components/app-nav.js";
import { renderDashboard } from "./pages/dashboard.js";
import { renderSecurityDetail } from "./pages/security-detail.js";
import { renderPeerComparePage } from "./pages/peer-compare.js";
import { renderTechnicalPatternsPage } from "./pages/technical-patterns.js";
import { renderCongressDisclosuresPage } from "./pages/congress-disclosures.js";
import { renderDataQualityPanelPage } from "./pages/data-quality-panel.js";
import { mockSecurities } from "./data/mock-securities.js";

const app = document.querySelector("#app");

let currentView = "dashboard";
let selectedTicker = null;

window.navigateTo = function navigateTo(viewId) {
  currentView = viewId;
  selectedTicker = null;
  renderApp();
};

window.openSecurityDetail = function openSecurityDetail(ticker) {
  selectedTicker = ticker;
  currentView = "security-detail";
  renderApp();
};

window.goToDashboard = function goToDashboard() {
  currentView = "dashboard";
  selectedTicker = null;
  renderApp();
};

function renderCurrentView() {
  if (currentView === "security-detail") {
    const security = mockSecurities.find((item) => item.ticker === selectedTicker);

    return `
      <button class="back-button" type="button" onclick="goToDashboard()">
        ← Torna alla dashboard
      </button>
      ${renderSecurityDetail(security)}
    `;
  }

  if (currentView === "peer-compare") {
    return renderPeerComparePage();
  }

  if (currentView === "technical-patterns") {
    return renderTechnicalPatternsPage();
  }

  if (currentView === "congress-disclosures") {
    return renderCongressDisclosuresPage();
  }

  if (currentView === "data-quality") {
    return renderDataQualityPanelPage();
  }

  return renderDashboard();
}

function getNavView() {
  if (currentView === "security-detail") {
    return "dashboard";
  }

  return currentView;
}

function renderApp() {
  app.innerHTML = `
    ${renderDisclaimerBanner()}
    <main class="container">
      ${renderAppNav(getNavView())}
      ${renderCurrentView()}
    </main>
  `;
}

renderApp();