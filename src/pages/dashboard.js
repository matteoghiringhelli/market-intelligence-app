import { mockSecurities } from "../data/mock-securities.js";
import { fetchRealQuote } from "../services/real-market-api.js";
import { fetchTechnicalPatternsFromDb } from "../services/technical-patterns-api.js";
import {
  setRealDataStatus,
  resetRealDataStatus
} from "../state/real-data-status.js";

let dashboardProvider = "fmp";
let dashboardQuotes = {};
let dashboardTechnicalPatterns = {};
let dashboardLoading = false;
let dashboardPatternLoading = false;
let dashboardError = null;
let dashboardPatternError = null;
let dashboardLastUpdate = null;
let dashboardPatternLastUpdate = null;

function renderSecurityCard(security) {
  const realQuote = dashboardQuotes[security.ticker];
  const hasRealQuote = Boolean(realQuote);

  const patternInfo = dashboardTechnicalPatterns[security.ticker];
  const hasPatternInfo = Boolean(patternInfo);

  const patternBadge = renderPatternStatusBadge(security.ticker, patternInfo);

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

  const patternSummaryBlock = hasPatternInfo
    ? `
      <div class="dashboard-pattern-summary">
        <p><strong>Pattern tecnici:</strong> ${patternInfo.patternsCount}</p>
        <p><strong>Ultimo pattern:</strong> ${formatValue(patternInfo.latestPatternName)}</p>
        <p><strong>Computed at:</strong> ${formatValue(patternInfo.latestComputedAt)}</p>
      </div>
    `
    : `
      <div class="dashboard-pattern-summary dashboard-pattern-summary--empty">
        <p><strong>Pattern tecnici:</strong> non caricati</p>
      </div>
    `;

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
          ${patternBadge}
        </div>
      </div>

      <div class="security-card__body">
        <p><strong>Settore:</strong> ${security.sector}</p>
        <p><strong>Industria:</strong> ${security.industry}</p>
        <p><strong>Qualità dati mock:</strong> ${security.dataQuality}</p>
        <p><strong>Ultimo aggiornamento mock:</strong> ${security.lastUpdate}</p>

        ${priceBlock}
        ${patternSummaryBlock}
      </div>

      ${auditBlock}

      <button class="button" type="button" onclick="openSecurityDetail('${security.ticker}')">
        Apri scheda titolo
      </button>
    </article>
  `;
}

function renderPatternStatusBadge(ticker, patternInfo) {
  if (dashboardPatternLoading) {
    return `
      <span class="quality-badge quality-badge--neutral">
        Pattern...
      </span>
    `;
  }

  if (!patternInfo) {
    return `
      <span class="quality-badge quality-badge--warning">
        Pattern n/d
      </span>
    `;
  }

  if (patternInfo.patternsCount > 0) {
    return `
      <span class="quality-badge quality-badge--ok">
        ${patternInfo.patternsCount} pattern
      </span>
    `;
  }

  return `
    <span class="quality-badge quality-badge--warning">
      0 pattern
    </span>
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
          ${dashboardLoading ? "Caricamento quote..." : "Carica quote reali"}
        </button>

        <button
          class="secondary-button"
          type="button"
          onclick="refreshDashboardTechnicalPatterns()"
          ${dashboardPatternLoading ? "disabled" : ""}
        >
          ${dashboardPatternLoading ? "Caricamento pattern..." : "Carica stato pattern"}
        </button>

        <button
          class="secondary-button"
          type="button"
          onclick="clearDashboardRealQuotes()"
          ${dashboardLoading || dashboardPatternLoading ? "disabled" : ""}
        >
          Torna ai mock
        </button>
      </div>
    </section>
  `;
}

function renderDashboardStatus() {
  const statusBlocks = [];

  if (dashboardLoading) {
    statusBlocks.push(`
      <section class="description-box">
        <p>
          Caricamento quote reali tramite provider <strong>${dashboardProvider}</strong>.
          Le richieste vengono eseguite una alla volta per rispettare i limiti free.
        </p>
      </section>
    `);
  }

  if (dashboardPatternLoading) {
    statusBlocks.push(`
      <section class="description-box">
        <p>
          Caricamento stato pattern tecnici da Supabase.
          La Dashboard resta leggibile anche durante il caricamento.
        </p>
      </section>
    `);
  }

  if (dashboardError) {
    statusBlocks.push(`
      <section class="audit-box">
        <p><strong>Messaggio API quote:</strong> ${dashboardError}</p>
        <p>
          La Dashboard resta utilizzabile con dati mock. Se il messaggio riguarda limiti free,
          riduci le richieste o usa un provider alternativo.
        </p>
      </section>
    `);
  }

  if (dashboardPatternError) {
    statusBlocks.push(`
      <section class="audit-box">
        <p><strong>Messaggio API pattern:</strong> ${dashboardPatternError}</p>
        <p>
          I pattern restano opzionali. Verifica che il job tecnico abbia popolato
          <code>technical_patterns</code>.
        </p>
      </section>
    `);
  }

  if (dashboardLastUpdate) {
    statusBlocks.push(`
      <section class="description-box">
        <p>
          Quote reali caricate correttamente.
          Ultimo aggiornamento quote: <strong>${dashboardLastUpdate}</strong>.
          Provider: <strong>${dashboardProvider}</strong>.
        </p>
      </section>
    `);
  }

  if (dashboardPatternLastUpdate) {
    statusBlocks.push(`
      <section class="description-box">
        <p>
          Stato pattern tecnici aggiornato.
          Ultimo aggiornamento pattern: <strong>${dashboardPatternLastUpdate}</strong>.
        </p>
      </section>
    `);
  }

  if (!statusBlocks.length) {
    return `
      <section class="note-box">
        <strong>Modalità sicura:</strong>
        la Dashboard parte con dati mock per evitare consumo automatico delle API free.
        Usa “Carica quote reali” o “Carica stato pattern” solo quando vuoi aggiornare
        i ticker visibili.
      </section>
    `;
  }

  return statusBlocks.join("");
}

function renderDashboardContent() {
  const cards = mockSecurities.map(renderSecurityCard).join("");

  return `
    <div class="panel-header">
      <div>
        <h2>Dashboard titoli</h2>
        <p>
          Dashboard con fallback mock, quote reali on-demand e stato pattern tecnici da Supabase.
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

  setRealDataStatus({
    status: "mock",
    label: "Mock only",
    provider: dashboardProvider,
    sourceId: "mock",
    lastUpdatedAt: dashboardLastUpdate,
    loadedSymbols: Object.keys(dashboardQuotes),
    message:
      "Provider selezionato per il prossimo caricamento reale. La Dashboard sta ancora mostrando dati mock o dati precedentemente caricati."
  });

  refreshDashboardPanel();
};

window.clearDashboardRealQuotes = function clearDashboardRealQuotes() {
  dashboardQuotes = {};
  dashboardTechnicalPatterns = {};
  dashboardError = null;
  dashboardPatternError = null;
  dashboardLastUpdate = null;
  dashboardPatternLastUpdate = null;

  resetRealDataStatus();

  refreshDashboardPanel();
};

window.refreshDashboardRealQuotes = async function refreshDashboardRealQuotes() {
  dashboardLoading = true;
  dashboardError = null;

  setRealDataStatus({
    status: "loading",
    label: "Loading",
    provider: dashboardProvider,
    sourceId: dashboardProvider,
    lastUpdatedAt: new Date().toISOString(),
    loadedSymbols: [],
    message:
      "Caricamento quote reali in corso tramite route multi-provider. Le richieste vengono eseguite una alla volta."
  });

  refreshDashboardPanel();

  const nextQuotes = {};

  try {
    for (const security of mockSecurities) {
      const payload = await fetchRealQuote(security.ticker, dashboardProvider);
      nextQuotes[security.ticker] = payload.data;
    }

    dashboardQuotes = nextQuotes;
    dashboardLastUpdate = new Date().toISOString();

    const sourceId = Object.values(nextQuotes)[0]?.source_id || dashboardProvider;

    setRealDataStatus({
      status: "loaded",
      label: "Real data loaded",
      provider: dashboardProvider,
      sourceId,
      lastUpdatedAt: dashboardLastUpdate,
      loadedSymbols: Object.keys(nextQuotes),
      message:
        "Quote reali caricate correttamente dalla Dashboard. I dati includono fonte, timestamp, data di riferimento e completezza."
    });
  } catch (error) {
    dashboardError = error.message;

    setRealDataStatus({
      status: "error",
      label: "API error",
      provider: dashboardProvider,
      sourceId: dashboardProvider,
      lastUpdatedAt: new Date().toISOString(),
      loadedSymbols: Object.keys(nextQuotes),
      message:
        error.message ||
        "Errore durante il caricamento delle quote reali. La Dashboard resta disponibile con dati mock."
    });
  } finally {
    dashboardLoading = false;
    refreshDashboardPanel();
  }
};

window.refreshDashboardTechnicalPatterns = async function refreshDashboardTechnicalPatterns() {
  dashboardPatternLoading = true;
  dashboardPatternError = null;
  refreshDashboardPanel();

  const nextPatternStatus = {};

  try {
    for (const security of mockSecurities) {
      const payload = await fetchTechnicalPatternsFromDb(security.ticker, 20);
      const patterns = payload?.data?.patterns || [];
      const latestPattern = patterns[0] || null;

      nextPatternStatus[security.ticker] = {
        patternsCount: patterns.length,
        latestPatternName: latestPattern?.pattern_name || null,
        latestComputedAt: latestPattern?.computed_at || null,
        sourceId: latestPattern?.source_id || payload?.data_quality?.source_id || null
      };
    }

    dashboardTechnicalPatterns = nextPatternStatus;
    dashboardPatternLastUpdate = new Date().toISOString();
  } catch (error) {
    dashboardPatternError = error.message;
  } finally {
    dashboardPatternLoading = false;
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