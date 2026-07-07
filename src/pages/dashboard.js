import { fetchRealPeerComparison } from "../services/peer-compare-api.js";
import {
  searchMarketUniverse,
  fetchTopBullishSignals,
  refreshMarketUniverse
} from "../services/market-universe-api.js";
import { runMarketRefreshSeries } from "../services/market-refresh-api.js";

let dashboardSearchQuery = "";
let dashboardSearchResults = [];
let dashboardTopSignals = [];
let dashboardPeerByTicker = {};
let dashboardStatus = "Caricamento Focus rialzista...";
let dashboardInitialLoadDone = false;

export function renderDashboard() {
  if (!dashboardInitialLoadDone) {
    dashboardInitialLoadDone = true;
    setTimeout(() => loadDashboardTopSignals(false), 0);
  }

  return `
    <header class="app-header">
      <div>
        <p class="eyebrow">Market Study</p>
        <h1>Oggi</h1>
        <p class="subtitle">
          Una vista mobile-first sui titoli Nasdaq/NYSE più interessanti da studiare
          secondo pattern tecnici descrittivi e metriche di confronto. Nessuna raccomandazione operativa.
        </p>
      </div>
    </header>

    <section class="panel">
      <div class="panel-header">
        <div>
          <h2>Focus operativo</h2>
          <p>
            Cerca un titolo oppure consulta il Focus rialzista calcolato sui segnali tecnici
            disponibili in Supabase.
          </p>
        </div>
      </div>

      <section class="dashboard-search-panel">
        <label>
          <span class="selector-label">Cerca titolo</span>
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
          Aggiorna universo
        </button>

        <button
          class="secondary-button"
          type="button"
          onclick="loadDashboardTopSignals(true)"
        >
          Aggiorna Focus
        </button>
      </section>


      <section class="market-refresh-panel note-box">
        <h3>Refresh mercato</h3>
        <p>
          Aggiorna in sequenza storico, pattern tecnici, fundamentals-lite e Focus.
          Usa batch piccoli per evitare timeout.
        </p>

        <div class="market-refresh-grid">
          <label>
            <span class="selector-label">Secret</span>
            <input
              id="market-refresh-secret"
              class="manual-operation-input"
              type="password"
              placeholder="CRON_SECRET"
            />
          </label>

          <label>
            <span class="selector-label">Offset</span>
            <input
              id="market-refresh-offset"
              class="manual-operation-input"
              type="number"
              value="0"
              min="0"
              step="10"
            />
          </label>

          <label>
            <span class="selector-label">Batch size</span>
            <input
              id="market-refresh-batch-size"
              class="manual-operation-input"
              type="number"
              value="10"
              min="1"
              max="50"
            />
          </label>

          <label>
            <span class="selector-label">Numero batch</span>
            <input
              id="market-refresh-batches"
              class="manual-operation-input"
              type="number"
              value="1"
              min="1"
              max="20"
            />
          </label>
        </div>

        <section class="peer-actions-row">
          <button
            class="button"
            type="button"
            onclick="runDashboardMarketRefresh()"
          >
            Avvia refresh mercato
          </button>
        </section>

        <div id="market-refresh-status" class="description-box">
          Pronto per aggiornare il mercato a batch.
        </div>
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
      ? "Ricalcolo Focus rialzista da pattern tecnici..."
      : "Lettura Focus rialzista da Supabase...";
  }

  try {
    const payload = await fetchTopBullishSignals(10, refresh);
    dashboardTopSignals = payload?.data?.records || [];

    dashboardStatus = `
      Focus caricati: <strong>${dashboardTopSignals.length}</strong>.
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
    dashboardStatus = `<strong>Errore Focus:</strong> ${escapeHtml(error.message)}`;

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
      const payload = await fetchRealPeerComparison(row.ticker, 5, false, true);
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
        <strong>Nessun Focus disponibile.</strong>
        <p>
          Completa la pipeline: universo Nasdaq/NYSE → storico prezzi → pattern tecnici
          → fundamentals-lite → ricalcolo Focus.
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
            Study Score
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
            <h4>Confronto peer</h4>
            <p class="muted-text">
              Confronto diretto su performance, volatilità e posizione nel range a 52 settimane.
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
        Apri titolo
      </button>
    </article>
  `;
}

function renderWhyInTop10(row, reasons) {
  const strongestReason = reasons[0];

  return `
    <section class="why-top10-box">
      <h4>Perché è rilevante</h4>

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
      <h4>Lettura teorica</h4>
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
          <td>${formatNumber(fundamentals.latest_close ?? peer.latest_close)}</td>
          <td>${formatPercent(fundamentals.return_260d)}</td>
          <td>${formatPercent(fundamentals.volatility_60d)}</td>
          <td>${formatPercent(fundamentals.distance_from_52w_high)}</td>
          <td>${formatPercent(fundamentals.price_position_52w)}</td>
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
            <th>Close</th>
            <th>Return 260d</th>
            <th>Vol. 60d</th>
            <th>Dist. 52w High</th>
            <th>Pos. 52w</th>
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
        confronto derivato da price_history interno: rendimento, volatilità e posizione nel range a 52 settimane.
        Non sono fondamentali contabili.
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
    return "n/d";
  }

  return new Intl.NumberFormat("it-IT", {
    maximumFractionDigits: 2
  }).format(numberValue);
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


window.runDashboardMarketRefresh = async function runDashboardMarketRefresh() {
  const statusEl = document.querySelector("#market-refresh-status");

  const secret = document.querySelector("#market-refresh-secret")?.value || "";
  const startOffset = Number(document.querySelector("#market-refresh-offset")?.value || 0);
  const batchSize = Number(document.querySelector("#market-refresh-batch-size")?.value || 10);
  const batches = Number(document.querySelector("#market-refresh-batches")?.value || 1);

  if (!secret.trim()) {
    if (statusEl) {
      statusEl.innerHTML = "Inserisci CRON_SECRET per avviare il refresh.";
    }
    return;
  }

  if (statusEl) {
    statusEl.innerHTML = "Refresh mercato avviato...";
  }

  try {
    const results = await runMarketRefreshSeries({
      startOffset,
      batches,
      batchSize,
      days: 260,
      limit: 260,
      secret,
      onProgress: (progress) => {
        if (!statusEl) {
          return;
        }

        if (progress.status === "running") {
          statusEl.innerHTML = `
            Batch ${progress.currentBatch}/${progress.totalBatches}
            in corso. Offset ${progress.offset}.
          `;
        }

        if (progress.status === "completed_batch") {
          const summary = progress.result?.history?.summary;

          statusEl.innerHTML = `
            Batch ${progress.currentBatch}/${progress.totalBatches}
            completato. Offset ${progress.offset}.
            Storico ok: ${summary?.successful_symbols || 0},
            falliti: ${summary?.failed_symbols || 0}.
          `;
        }
      }
    });

    if (statusEl) {
      statusEl.innerHTML = `
        Refresh completato. Batch eseguiti: <strong>${results.length}</strong>.
        Premi “Aggiorna Focus” per rileggere la Dashboard.
      `;
    }
  } catch (error) {
    if (statusEl) {
      statusEl.innerHTML = `<strong>Errore refresh:</strong> ${escapeHtml(error.message)}`;
    }
  }
};
