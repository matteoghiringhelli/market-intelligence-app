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
          La Dashboard non mostra tutto l'universo Nasdaq/NYSE: seleziona i 10 titoli
          con più condizioni tecniche che la teoria interpreta come coerenti con momentum
          o trend rialzista, con finalità esclusivamente istruttiva.
        </p>
      </div>
    </header>

    <section class="panel">
      <div class="panel-header">
        <div>
          <h2>Market Study Focus</h2>
          <p>
            Cerca qualunque titolo dell'universo Nasdaq/NYSE oppure studia la selezione
            dei Top 10 Bullish Study Score. Non sono raccomandazioni operative.
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
    statusEl.innerHTML = "Aggiornamento universo Nasdaq/NYSE da fonte ufficiale NasdaqTrader...";
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

window.openDashboardSecurityDetail = function openDashboardSecurityDetail(symbol) {
  const normalizedSymbol = String(symbol || "").trim().toUpperCase();

  if (!normalizedSymbol) {
    return;
  }

  if (typeof window.openSecurityDetail === "function") {
    window.openSecurityDetail(normalizedSymbol);
    return;
  }

  window.location.hash = `security/${normalizedSymbol}`;
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
          onclick="openDashboardSecurityDetail('${escapeJsString(row.ticker)}')"
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
        <strong>Nessun Top 10 disponibile.</strong>
        <p>
          Per alimentare questa sezione completa la pipeline:
          universo Nasdaq/NYSE → storico prezzi → pattern tecnici → ricalcolo Top 10.
        </p>
      </section>
    `;
  }

  const cards = dashboardTopSignals
    .map((row, index) => renderTopSignalCard(row, index + 1))
    .join("");

  return `
    <section class="top-signals-intro note-box">
      <strong>Come leggere questa selezione:</strong>
      <p>
        La lista ordina i titoli per numero e intensità di pattern tecnici che la teoria
        normalmente interpreta come coerenti con momentum o trend rialzista. Non indica
        cosa comprare, vendere o detenere.
      </p>
    </section>

    <section class="top-signals-grid">
      ${cards}
    </section>
  `;
}

function renderTopSignalCard(row, rank) {
  const peerPayload = dashboardPeerByTicker[row.ticker];
  const peerRows = peerPayload?.data?.rows || [];
  const reasons = normalizeReasons(row.reasons);

  return `
    <article class="top-signal-card">
      <div class="top-signal-card__header">
        <div>
          <p class="eyebrow">Rank #${rank} · ${escapeHtml(row.exchange_short_name || "n/d")}</p>
          <h3>${escapeHtml(row.ticker)}</h3>
          <p>${escapeHtml(row.company_name || "n/d")}</p>
        </div>

        <div class="top-score-box">
          <span class="quality-badge quality-badge--ok">
            Bullish Study Score
          </span>
          <strong>${formatNumber(row.bullish_score)}</strong>
          <small>${formatValue(row.bullish_signal_count)} segnali</small>
        </div>
      </div>

      ${renderWhyInTop10(row, reasons)}

      ${renderSignalReasons(reasons)}

      <section class="embedded-peer-comparison">
        <div class="embedded-peer-comparison__header">
          <div>
            <h4>Peer Compare sintetico</h4>
            <p class="muted-text">
              Confronto diretto tra titolo base e peer disponibili in cache.
            </p>
          </div>
        </div>

        ${renderPeerComparisonMini(peerRows, row.ticker)}
      </section>

      <section class="audit-box">
        <p>
          <strong>Nota educativa:</strong>
          score e pattern descrivono condizioni osservate sui dati storici.
          Non sono segnali operativi e non prevedono automaticamente movimenti futuri.
        </p>
      </section>

      <button
        class="button"
        type="button"
        onclick="openDashboardSecurityDetail('${escapeJsString(row.ticker)}')"
      >
        Apri scheda titolo
      </button>
    </article>
  `;
}

function renderWhyInTop10(row, reasons) {
  const strongestReason = reasons[0];

  return `
    <section class="why-top10-box">
      <h4>Perché è nei Top 10</h4>

      <div class="why-top10-grid">
        <div>
          <p class="metric-label">Score</p>
          <strong>${formatNumber(row.bullish_score)}</strong>
        </div>

        <div>
          <p class="metric-label">Numero segnali</p>
          <strong>${formatValue(row.bullish_signal_count)}</strong>
        </div>

        <div>
          <p class="metric-label">Ultimo pattern</p>
          <strong>${escapeHtml(row.latest_pattern_name || "n/d")}</strong>
        </div>
      </div>

      ${
        strongestReason
          ? `
            <section class="description-box">
              <p>
                <strong>Segnale più rilevante:</strong>
                ${escapeHtml(strongestReason.pattern_name || "Pattern")}
              </p>
              <p>
                ${escapeHtml(
                  strongestReason.theoretical_reading ||
                    strongestReason.explanation ||
                    "Lettura teorica non disponibile."
                )}
              </p>
            </section>
          `
          : ""
      }
    </section>
  `;
}

function renderSignalReasons(reasons) {
  if (!reasons.length) {
    return "";
  }

  const items = reasons
    .slice(0, 4)
    .map((reason) => {
      return `
        <li>
          <strong>${escapeHtml(reason.pattern_name || "Pattern")}</strong>
          <p>
            ${escapeHtml(
              reason.theoretical_reading ||
                reason.explanation ||
                "Lettura teorica non disponibile."
            )}
          </p>
          ${
            reason.limitations_note
              ? `<small>${escapeHtml(reason.limitations_note)}</small>`
              : ""
          }
        </li>
      `;
    })
    .join("");

  return `
    <section class="signal-reasons-box">
      <h4>Lettura teorica dei segnali</h4>
      <ul>
        ${items}
      </ul>
    </section>
  `;
}

function renderPeerComparisonMini(peerRows, baseTicker) {
  if (!peerRows.length) {
    return `
      <p class="muted-text">
        Peer non ancora disponibili in cache. Apri Peer Compare o aggiorna peer
        per questo titolo.
      </p>
    `;
  }

  const rows = peerRows
    .slice(0, 6)
    .map((peer) => {
      const isBase = peer.ticker === baseTicker || peer.role === "base";
      const fundamentals = peer.fundamentals || {};

      return `
        <tr class="${isBase ? "peer-row-base" : ""}">
          <td>
            <strong>${escapeHtml(peer.ticker)}</strong>
            ${isBase ? `<span class="mini-badge">Base</span>` : ""}
          </td>
          <td>${formatMarketCap(fundamentals.market_cap)}</td>
          <td>${formatNumber(fundamentals.trailing_pe)}</td>
          <td>${formatPercent(fundamentals.profit_margin)}</td>
          <td>${formatPercent(fundamentals.return_on_equity)}</td>
          <td>${formatNumber(fundamentals.debt_to_equity)}</td>
          <td>${formatValue(fundamentals.completeness_score)}%</td>
        </tr>
      `;
    })
    .join("");

  return `
    <div class="history-table-wrapper">
      <table class="history-table peer-mini-table">
        <thead>
          <tr>
            <th>Ticker</th>
            <th>Mkt Cap</th>
            <th>P/E</th>
            <th>Profit Margin</th>
            <th>ROE</th>
            <th>D/E</th>
            <th>Comp.</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>

    <section class="note-box peer-fundamentals-note">
      <p>
        <strong>Lettura:</strong>
        questa tabella facilita il confronto diretto fra titolo base e peer su dimensione,
        valutazione, redditività e leva. Le metriche sono descrittive e possono essere
        incomplete o distorte da eventi non ricorrenti.
      </p>
    </section>
  `;
}

function normalizeReasons(reasons) {
  if (Array.isArray(reasons)) {
    return reasons;
  }

  if (typeof reasons === "string") {
    try {
      const parsed = JSON.parse(reasons);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return [];
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

function formatMarketCap(value) {
  if (value === null || value === undefined || value === "") {
    return "n/d";
  }

  const numberValue = Number(value);

  if (Number.isNaN(numberValue)) {
    return "n/d";
  }

  if (numberValue >= 1_000_000_000_000) {
    return `${formatNumber(numberValue / 1_000_000_000_000)}T`;
  }

  if (numberValue >= 1_000_000_000) {
    return `${formatNumber(numberValue / 1_000_000_000)}B`;
  }

  if (numberValue >= 1_000_000) {
    return `${formatNumber(numberValue / 1_000_000)}M`;
  }

  return formatNumber(numberValue);
}

function formatPercent(value) {
  if (value === null || value === undefined || value === "") {
    return "n/d";
  }

  const numberValue = Number(value);

  if (Number.isNaN(numberValue)) {
    return "n/d";
  }

  return `${formatNumber(numberValue * 100)}%`;
}
