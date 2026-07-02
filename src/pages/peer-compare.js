import { fetchRealPeerComparison } from "../services/peer-compare-api.js";

let selectedPeerSymbol = "AAPL";

const availablePeerSymbols = ["AAPL", "MSFT", "JPM", "NVDA", "AMZN"];

const mockPeerFallback = [
  {
    ticker: "AAPL",
    description:
      "Fallback educativo: il confronto peer reale verrà mostrato sopra se disponibile."
  },
  {
    ticker: "MSFT",
    description:
      "Fallback educativo: usa dati mock solo se il provider o Supabase non rispondono."
  }
];

export function renderPeerComparePage() {
  setTimeout(() => loadRealPeerCompare(selectedPeerSymbol), 0);

  const mockCards = mockPeerFallback.map(renderMockPeerCard).join("");

  return `
    <header class="app-header">
      <div>
        <p class="eyebrow">Peer & Relative Analysis</p>
        <h1>Peer Compare</h1>
        <p class="subtitle">
          Confronto descrittivo tra titolo base e peer group reale da provider esterno,
          arricchito con dati storici salvati in Supabase.
        </p>
      </div>
    </header>

    <section class="panel">
      <div class="panel-header">
        <div>
          <h2>Peer Compare reale</h2>
          <p>
            Peer group recuperato da FMP e metriche storiche lette da Supabase.
          </p>
        </div>
      </div>

      <section class="selector-section">
        <p class="selector-label">Ticker base</p>
        <div class="symbol-selector">
          ${availablePeerSymbols.map(renderSymbolButton).join("")}
        </div>
      </section>

      <div id="peer-compare-status" class="description-box">
        Caricamento peer compare per ${selectedPeerSymbol}...
      </div>

      <div id="peer-compare-real-content"></div>

      <section class="detail-section">
        <h3>Fallback mock educativo</h3>
        <p class="muted-text">
          Il fallback resta visibile solo come riferimento UX se i dati reali non sono disponibili.
        </p>
        <div class="stack">
          ${mockCards}
        </div>
      </section>
    </section>
  `;
}

function renderSymbolButton(symbol) {
  const activeClass = selectedPeerSymbol === symbol ? "symbol-button--active" : "";

  return `
    <button
      class="symbol-button ${activeClass}"
      type="button"
      onclick="selectPeerSymbol('${symbol}')"
    >
      ${symbol}
    </button>
  `;
}

window.selectPeerSymbol = function selectPeerSymbol(symbol) {
  selectedPeerSymbol = symbol;
  updatePeerButtons();
  loadRealPeerCompare(symbol);
};

async function loadRealPeerCompare(symbol) {
  const statusEl = document.querySelector("#peer-compare-status");
  const contentEl = document.querySelector("#peer-compare-real-content");

  if (!statusEl || !contentEl) {
    return;
  }

  statusEl.innerHTML = `
    <p>Caricamento peer group reale per <strong>${symbol}</strong>...</p>
  `;

  contentEl.innerHTML = "";

  try {
    const payload = await fetchRealPeerComparison(symbol, 8);
    const rows = payload?.data?.rows || [];

    if (!rows.length) {
      statusEl.innerHTML = `
        <p>Nessun dato peer reale disponibile per <strong>${symbol}</strong>.</p>
      `;
      return;
    }

    statusEl.innerHTML = `
      <p>
        Peer Compare reale caricato. Peer rilevati:
        <strong>${payload.data.peers_count}</strong>.
        Completezza: <strong>${payload.data_quality?.completeness_score || 0}%</strong>.
      </p>
    `;

    contentEl.innerHTML = renderRealPeerTable(payload);
  } catch (error) {
    statusEl.innerHTML = `
      <p><strong>Errore Peer Compare reale:</strong> ${error.message}</p>
      <p>La pagina resta disponibile con fallback mock.</p>
    `;
  }
}

function renderRealPeerTable(payload) {
  const rows = payload.data.rows;

  const tableRows = rows
    .map((row) => {
      const roleBadge =
        row.role === "base"
          ? `<span class="quality-badge quality-badge--ok">Base</span>`
          : `<span class="quality-badge quality-badge--neutral">Peer</span>`;

      return `
        <tr>
          <td>${formatValue(row.ticker)}</td>
          <td>${roleBadge}</td>
          <td>${formatNumber(row.latest_close)}</td>
          <td>${formatValue(row.latest_date)}</td>
          <td>${formatValue(row.records_count)}</td>
          <td>${formatValue(row.relative_close_vs_base)}%</td>
          <td>${formatValue(row.average_completeness_score)}%</td>
        </tr>
      `;
    })
    .join("");

  const cards = rows.map(renderPeerMobileCard).join("");

  return `
    <section class="detail-section">
      <h3>Peer group reale</h3>

      <div class="history-table-wrapper history-table-wrapper--desktop">
        <table class="history-table">
          <thead>
            <tr>
              <th>Ticker</th>
              <th>Ruolo</th>
              <th>Ultimo close</th>
              <th>Data</th>
              <th>Record storici</th>
              <th>Close vs base</th>
              <th>Completezza</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
      </div>

      <div class="daily-history-card-list">
        ${cards}
      </div>

      <section class="audit-box">
        <p><strong>Metodologia:</strong> ${payload.methodology}</p>
        <p><strong>Disclaimer:</strong> ${payload.disclaimer}</p>
      </section>
    </section>
  `;
}

function renderPeerMobileCard(row) {
  const badgeClass = row.role === "base" ? "quality-badge--ok" : "quality-badge--neutral";

  return `
    <article class="daily-history-card">
      <div class="daily-history-card__header">
        <div>
          <p class="metric-label">Ticker</p>
          <h3>${formatValue(row.ticker)}</h3>
        </div>

        <span class="quality-badge ${badgeClass}">
          ${row.role === "base" ? "Base" : "Peer"}
        </span>
      </div>

      <div class="daily-history-card__main">
        <div>
          <p class="metric-label">Ultimo close</p>
          <strong>${formatNumber(row.latest_close)}</strong>
        </div>

        <div>
          <p class="metric-label">Close vs base</p>
          <strong>${formatValue(row.relative_close_vs_base)}%</strong>
        </div>
      </div>

      <div class="daily-history-card__ohlc">
        <div>
          <p class="metric-label">Data</p>
          <strong>${formatValue(row.latest_date)}</strong>
        </div>

        <div>
          <p class="metric-label">Record</p>
          <strong>${formatValue(row.records_count)}</strong>
        </div>

        <div>
          <p class="metric-label">Completezza</p>
          <strong>${formatValue(row.average_completeness_score)}%</strong>
        </div>
      </div>
    </article>
  `;
}

function renderMockPeerCard(item) {
  return `
    <article class="comparison-card">
      <h3>${item.ticker}</h3>
      <p>${item.description}</p>
    </article>
  `;
}

function updatePeerButtons() {
  document.querySelectorAll(".symbol-button").forEach((button) => {
    button.classList.toggle(
      "symbol-button--active",
      button.textContent.trim() === selectedPeerSymbol
    );
  });
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
