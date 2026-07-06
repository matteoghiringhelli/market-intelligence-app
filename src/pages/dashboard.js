import { fetchRealPeerComparison } from "../services/peer-compare-api.js";
import {
  searchMarketUniverse,
  fetchTopBullishSignals,
  refreshMarketUniverse
} from "../services/market-universe-api.js";

let dashboardSearchQuery = "";
let dashboardSearchResults = [];
let dashboardTopSignals = [];
let dashboardPeerByTicker = {};
let dashboardStatus = "Caricamento Top 10 Bullish Study Score...";
let dashboardInitialLoadDone = false;

export function renderDashboard() {
  if (!dashboardInitialLoadDone) {
    dashboardInitialLoadDone = true;
    setTimeout(() => loadDashboardTopSignals(false), 0);
  }

  return `
    <header class="app-header">
      <div>
        <p class="eyebrow">Educational Market Intelligence</p>
        <h1>Dashboard</h1>
        <p class="subtitle">
          Dashboard focalizzata sui 10 titoli Nasdaq/NYSE con più condizioni tecniche
          normalmente interpretate come coerenti con momentum o trend rialzista.
        </p>
      </div>
    </header>

    <section class="panel">
      <div class="panel-header">
        <div>
          <h2>Market Study Focus</h2>
          <p>
            Cerca qualunque titolo dell'universo Nasdaq/NYSE oppure studia i Top 10
            per Bullish Study Score. Non sono raccomandazioni operative.
          </p>
        </div>
      </div>

      <section class="dashboard-search-panel">
        <label>
          <span class="selector-label">Cerca ticker o nome società</span>
          <input
            id="dashboard-security-search"
            class="manual-operation-input"
            type="search"
            placeholder="Esempio: AAPL, Apple, Tesla, JPM..."
            value="${escapeHtmlAttribute(dashboardSearchQuery)}"
            oninput="searchDashboardUniverse(this.value)"
          />
        </label>

        <div id="dashboard-search-results">
          ${renderDashboardSearchResults()}
        </div>
      </section>

      <section class="peer-actions-row">
        <button
          class="button"
          type="button"
          onclick="refreshDashboardUniverseFromUi()"
        >
          Aggiorna universo Nasdaq/NYSE
        </button>

        <button
          class="secondary-button"
          type="button"
          onclick="loadDashboardTopSignals(true)"
        >
          Ricalcola Top 10 segnali
        </button>
      </section>

      <div id="dashboard-status" class="description-box">
        ${dashboardStatus}
      </div>

      <div id="dashboard-top-signals">
        ${renderTopSignals()}
      </div>
    </section>
  `;
}

window.searchDashboardUniverse = async function searchDashboardUniverse(query) {
  dashboardSearchQuery = query;

  const resultsEl = document.querySelector("#dashboard-search-results");

  if (!resultsEl) {
    return;
  }

  if (!query || query.trim().length < 2) {
    dashboardSearchResults = [];
    resultsEl.innerHTML = renderDashboardSearchResults();
    return;
  }

  try {
    const payload = await searchMarketUniverse(query, 20);
    dashboardSearchResults = payload?.data?.records || [];
    resultsEl.innerHTML = renderDashboardSearchResults();
  } catch (error) {
    resultsEl.innerHTML = `
      <section class="audit-box">
        <p><strong>Errore ricerca:</strong> ${escapeHtml(error.message)}</p>
      </section>
    `;
  }
};

window.refreshDashboardUniverseFromUi = async function refreshDashboardUniverseFromUi() {
  const statusEl = document.querySelector("#dashboard-status");

  if (statusEl) {
    statusEl.innerHTML = "Aggiornamento universo Nasdaq/NYSE da provider...";
  }

  try {
    const payload = await refreshMarketUniverse();

    dashboardStatus = `
      Universo aggiornato. Record upserted:
      <strong>${payload.data?.upserted || 0}</strong>.
    `;

    if (statusEl) {
      statusEl.innerHTML = dashboardStatus;
    }
  } catch (error) {
    dashboardStatus = `<strong>Errore universe refresh:</strong> ${escapeHtml(error.message)}`;

    if (statusEl) {
      statusEl.innerHTML = dashboardStatus;
    }
  }
};

window.loadDashboardTopSignals = async function loadDashboardTopSignals(refresh = false) {
  const statusEl = document.querySelector("#dashboard-status");
  const contentEl = document.querySelector("#dashboard-top-signals");

  if (statusEl) {
    statusEl.innerHTML = refresh
      ? "Ricalcolo Bullish Study Score da pattern tecnici..."
      : "Lettura Top 10 Bullish Study Score da Supabase...";
  }

  try {
    const payload = await fetchTopBullishSignals(10, refresh);
    dashboardTopSignals = payload?.data?.records || [];

    dashboardStatus = `
      Top 10 caricati: <strong>${dashboardTopSignals.length}</strong>.
      ${payload.disclaimer || ""}
    `;

    if (statusEl) {
      statusEl.innerHTML = dashboardStatus;
    }

    if (contentEl) {
      contentEl.innerHTML = renderTopSignals();
    }

    await loadPeersForTopSignals();
  } catch (error) {
    dashboardStatus = `<strong>Errore Top 10:</strong> ${escapeHtml(error.message)}`;

    if (statusEl) {
      statusEl.innerHTML = dashboardStatus;
    }
  }
};

async function loadPeersForTopSignals() {
  const contentEl = document.querySelector("#dashboard-top-signals");

  for (const row of dashboardTopSignals) {
    if (dashboardPeerByTicker[row.ticker]) {
      continue;
    }

    try {
      const payload = await fetchRealPeerComparison(row.ticker, 5, false);
      dashboardPeerByTicker[row.ticker] = payload;
    } catch {
      dashboardPeerByTicker[row.ticker] = null;
    }
  }

  if (contentEl) {
    contentEl.innerHTML = renderTopSignals();
  }
}

function renderDashboardSearchResults() {
  if (!dashboardSearchResults.length) {
    return "";
  }

  const rows = dashboardSearchResults
    .map((row) => {
      return `
        <button
          class="dashboard-search-result"
          type="button"
          onclick="openSecurityDetail('${escapeJsString(row.ticker)}')"
        >
          <strong>${escapeHtml(row.ticker)}</strong>
          <span>${escapeHtml(row.company_name || "n/d")}</span>
          <small>${escapeHtml(row.exchange_short_name || "n/d")}</small>
        </button>
      `;
    })
    .join("");

  return `
    <section class="dashboard-search-results-list">
      ${rows}
    </section>
  `;
}

function renderTopSignals() {
  if (!dashboardTopSignals.length) {
    return `
      <section class="note-box">
        Nessun Bullish Study Score disponibile. Aggiorna universo, carica storico/pattern
        a batch e poi clicca “Ricalcola Top 10 segnali”.
      </section>
    `;
  }

  const cards = dashboardTopSignals.map(renderTopSignalCard).join("");

  return `
    <section class="top-signals-grid">
      ${cards}
    </section>
  `;
}

function renderTopSignalCard(row) {
  const peerPayload = dashboardPeerByTicker[row.ticker];
  const peerRows = peerPayload?.data?.rows || [];

  return `
    <article class="top-signal-card">
      <div class="top-signal-card__header">
        <div>
          <p class="eyebrow">${escapeHtml(row.exchange_short_name || "n/d")}</p>
          <h3>${escapeHtml(row.ticker)}</h3>
          <p>${escapeHtml(row.company_name || "n/d")}</p>
        </div>

        <span class="quality-badge quality-badge--ok">
          Score ${formatNumber(row.bullish_score)}
        </span>
      </div>

      <section class="description-box">
        <p><strong>Segnali:</strong> ${formatValue(row.bullish_signal_count)}</p>
        <p><strong>Ultimo pattern:</strong> ${escapeHtml(row.latest_pattern_name || "n/d")}</p>
        <p><strong>Computed:</strong> ${formatValue(row.latest_computed_at)}</p>
      </section>

      ${renderSignalReasons(row.reasons)}

      <section class="embedded-peer-comparison">
        <h4>Peer Compare sintetico</h4>
        ${renderPeerComparisonMini(peerRows)}
      </section>

      <button class="button" type="button" onclick="openSecurityDetail('${escapeJsString(row.ticker)}')">
        Apri scheda titolo
      </button>
    </article>
  `;
}

function renderSignalReasons(reasons) {
  const parsedReasons = Array.isArray(reasons) ? reasons : [];

  if (!parsedReasons.length) {
    return "";
  }

  const items = parsedReasons
    .slice(0, 3)
    .map((reason) => {
      return `
        <li>
          <strong>${escapeHtml(reason.pattern_name || "Pattern")}</strong> —
          ${escapeHtml(reason.theoretical_reading || "lettura teorica non disponibile")}
        </li>
      `;
    })
    .join("");

  return `
    <section class="note-box">
      <p><strong>Lettura teorica:</strong></p>
      <ul>
        ${items}
      </ul>
    </section>
  `;
}

function renderPeerComparisonMini(peerRows) {
  if (!peerRows.length) {
    return `
      <p class="muted-text">
        Peer non ancora disponibili in cache. Apri Peer Compare o aggiorna peer per questo titolo.
      </p>
    `;
  }

  const rows = peerRows
    .slice(0, 6)
    .map((peer) => {
      return `
        <tr>
          <td>${escapeHtml(peer.ticker)}</td>
          <td>${escapeHtml(peer.role)}</td>
          <td>${formatNumber(peer.latest_close)}</td>
          <td>${formatValue(peer.relative_close_vs_base)}%</td>
          <td>${formatValue(peer.records_count)}</td>
        </tr>
      `;
    })
    .join("");

  return `
    <div class="history-table-wrapper">
      <table class="history-table">
        <thead>
          <tr>
            <th>Ticker</th>
            <th>Ruolo</th>
            <th>Close</th>
            <th>Vs base</th>
            <th>Storico</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>
  `;
}

function formatValue(value) {
  if (value === null || value === undefined || value === "") {
    return "n/d";
  }

  return value;
}

function formatNumber(value) {
  if (value === null || value === undefined || value === "") {
    return "n/d";
  }

  const numberValue = Number(value);

  if (Number.isNaN(numberValue)) {
    return value;
  }

  return new Intl.NumberFormat("it-IT", {
    maximumFractionDigits: 2
  }).format(numberValue);
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeHtmlAttribute(value) {
  return escapeHtml(value);
}

function escapeJsString(value) {
  return String(value || "")
    .replaceAll("\\", "\\\\")
    .replaceAll("'", "\\'")
    .replaceAll("\n", " ")
    .replaceAll("\r", " ");
}
