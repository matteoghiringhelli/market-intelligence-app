import "./style.css";
import { renderDisclaimerBanner } from "./components/disclaimer-banner.js";
import { renderDashboard } from "./pages/dashboard.js";
import { renderSecurityDetail } from "./pages/security-detail.js";
import { mockSecurities } from "./data/mock-securities.js";

const app = document.querySelector("#app");

let currentView = "dashboard";
let selectedTicker = null;

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

  return renderDashboard();
}

function renderApp() {
  app.innerHTML = `
    ${renderDisclaimerBanner()}
    <main class="container">
      ${renderCurrentView()}
    </main>
  `;
}

renderApp();