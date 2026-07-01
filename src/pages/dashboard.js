import { mockSecurities } from "../data/mock-securities.js";
import { fetchRealQuote } from "../services/real-market-api.js";

let dashboardProvider = "fmp";
let dashboardQuotes = {};
let dashboardLoading = false;
let dashboardError = null;
let dashboardLastUpdate = null;

function renderSecurityCard(security) {
  const realQuote = dashboardQuotes[security.ticker];
  const hasRealQuote = Boolean(realQuote);

  const priceBlock = hasRealQuote
    ? `
      <div class="dashboard-real-data">
        <p><strong>Prezzo reale:</strong> ${formatValue(realQuote.price)}</p>
        <p><strong>Variazione:</strong> ${formatValue(realQuote.changePercent)}</p>
        <p><strong>Volume:</strong> ${formatValue(realQuote.volume)}</p>
        <p><strong>Data dato:</strong> ${formatValue(realQuote.data_as_of)}</p>
      </div>
    `
    : `
      <div class="dashboard-mock-data">
        <p><strong>Dato reale:</strong> non ancora caricato</p>
      </div>
    `;

  const qualityBadge = hasRealQuote
    ? `
      <span class="quality-badge ${
        realQuote.completeness_score >= 80 ? "quality-badge--ok" : "quality-badge--warning"
      }">
        Completezza ${realQuote.completeness_score}%
      </span>
    `
    : `<span class="quality-badge quality-badge--neutral">Mock</span>`;

  const auditBlock = hasRealQuote
    ? `
      <section class="audit-box dashboard-audit-box">
        <p><strong>Fonte:</strong> ${realQuote.source_id}</p>
        <p><strong>Fetched at:</strong> ${realQuote.fetched_at}</p>
        <p><strong>Data as of:</strong> ${formatValue(realQuote.data_as_of)}</p>
        <p><strong>Provider:</strong> ${dashboardProvider}</p>
      </section>
    `
    : `
      <section class="audit-box dashboard-audit-box">
        <p><strong>Fonte:</strong> ${security.source}</p>
        <p><strong>Nota:</strong> dati mock didattici. Clicca “Carica quote reali” per aggiornare.</p>
      </section>
    `;

  return `
    <article class="security-card">
      <div class="security-card__top">
        <div>
          <h2>${security.ticker}</h2>
          <p>${security.companyName}</p>
        </div>
        <div class="dashboard-card-badges">
          <span class="badge">${security.exchange}</span>
          ${qualityBadge}
        </div>
      </div>

      <div class="security-card__body">
        <p><strong>Settore:</strong> ${security.sector}</p>
        <p><strong>Industria:</strong> ${security.industry}</p>
        <p><strong>Qualità dati mock:</strong> ${security.dataQuality}</p>
        <p><strong>Ultimo aggiornamento mock:</strong> ${security.lastUpdate}</p>

        ${priceBlock}
      </div>

      ${auditBlock}

      <button class="button" type="button" onclick="openSecurityDetail('${security.ticker}')">
        Apri scheda titolo
      </button>
    </article>
  `;
}

function renderDashboardControls() {
  return `
    <section class="dashboard-controls">
      <div>
        <p class="selector-label">Provider dati reali</p>

        <div class="symbol-selector">
          <button
            class="symbol-button ${dashboardProvider === "fmp" ? "symbol-button--active" : ""}"
            type="button"
            onclick="setDashboardProvider('fmp')"
          >
            FMP
          </button>

          <button
            class="symbol-button ${dashboardProvider === "alpha" ? "symbol-button--active" : ""}"
            type="button"
            onclick="setDashboardProvider('alpha')"
          >
            Alpha Vantage
          </button>
        </div>
      </div>

      <div class="dashboard-actions">
        <button
          class="button dashboard-refresh-button"
          type="button"
          onclick="refreshDashboardRealQuotes()"
          ${dashboardLoading ? "disabled" : ""}
        >
          ${dashboardLoading ? "Caricamento..." : "Carica quote reali"}
        </button>

        <button
          class="secondary-button"
          type="button"
          onclick="clearDashboardRealQuotes()"
          ${dashboardLoading ? "disabled" : ""}
        >
          Torna ai mock
        </button>
      </div>
    </section>
  `;
}

function renderDashboardStatus() {
  if (dashboardLoading) {
    return `
      <section class="description-box">
        <p>
          Caricamento quote reali tramite provider <strong>${dashboardProvider}</strong>.
          Le richieste vengono eseguite una alla volta per rispettare i limiti free.
        </p>
      </section>
    `;
  }

  if (dashboardError) {
    return `
      <section class="audit-box">
        <p><strong>Messaggio API:</strong> ${dashboardError}</p>
        <p>
          La Dashboard resta utilizzabile con dati mock. Se il messaggio riguarda limiti free,
          riduci le richieste o usa un provider alternativo.
        </p>
      </section>
    `;
  }

  if (dashboardLastUpdate) {
    return `
      <section class="description-box">
        <p>
          Quote reali caricate correttamente.
          Ultimo aggiornamento UI: <strong>${dashboardLastUpdate}</strong>.
          Provider: <strong>${dashboardProvider}</strong>.
        </p>
      </section>
    `;
  }

  return `
    <section class="note-box">
      <strong>Modalità sicura:</strong>
      la Dashboard parte con dati mock per evitare consumo automatico delle API free.
      Usa “Carica quote reali” solo quando vuoi aggiornare i ticker visibili.
    </section>
  `;
}

function renderDashboardContent() {
  const cards = mockSecurities.map(renderSecurityCard).join("");

  return `
    <div class="panel-header">
      <div>
        <h2>Dashboard titoli</h2>
        <p>
          Dashboard con fallback mock e quote reali on-demand tramite route multi-provider.
        </p>
      </div>
    </div>

    ${renderDashboardControls()}
    ${renderDashboardStatus()}

    <div class="grid">
      ${cards}
    </div>
  `;
}

export function renderDashboard() {
  return `
    <header class="app-header">
      <div>
        <p class="eyebrow">Educational Market Intelligence</p>
        <h1>Market Intelligence App</h1>
        <p class="subtitle">
          Dashboard didattica per consultare dati descrittivi su titoli azionari,
          peer group, pattern tecnici e qualità dati.
        </p>
      </div>
    </header>

    <section id="dashboard-panel" class="panel">
      ${renderDashboardContent()}
    </section>
  `;
}

window.setDashboardProvider = function setDashboardProvider(provider) {
  dashboardProvider = provider;
  dashboardError = null;
  refreshDashboardPanel();
};

window.clearDashboardRealQuotes = function clearDashboardRealQuotes() {
  dashboardQuotes = {};
  dashboardError = null;
  dashboardLastUpdate = null;
  refreshDashboardPanel();
};

window.refreshDashboardRealQuotes = async function refreshDashboardRealQuotes() {
  dashboardLoading = true;
  dashboardError = null;
  refreshDashboardPanel();

  const nextQuotes = {};

  try {
    for (const security of mockSecurities) {
      const payload = await fetchRealQuote(security.ticker, dashboardProvider);
      nextQuotes[security.ticker] = payload.data;
    }

    dashboardQuotes = nextQuotes;
    dashboardLastUpdate = new Date().toISOString();
  } catch (error) {
    dashboardError = error.message;
  } finally {
    dashboardLoading = false;
    refreshDashboardPanel();
  }
};

function refreshDashboardPanel() {
  const panel = document.querySelector("#dashboard-panel");

  if (!panel) {
    return;
  }

  panel.innerHTML = renderDashboardContent();
}

function formatValue(value) {
  if (value === null || value === undefined || value === "") {
    return "n/d";
  }

  return value;
}