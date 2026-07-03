import { fetchRealCongressDisclosures } from "../services/congress-disclosures-api.js";

let selectedCongressSymbol = "AAPL";
let selectedCongressChamber = "both";
let congressLoading = false;
let congressLastMode = "cache";

const congressSymbols = ["AAPL", "MSFT", "JPM", "NVDA", "AMZN"];

const congressChambers = [
  { id: "both", label: "House + Senate" },
  { id: "house", label: "House" },
  { id: "senate", label: "Senate" }
];

const mockCongressFallback = [
  {
    memberName: "Mock Disclosure",
    description:
      "Fallback educativo: se il provider non restituisce dati reali, questa sezione ricorda i limiti metodologici delle disclosure."
  }
];

export function renderCongressDisclosuresPage() {
  setTimeout(() => loadRealCongressDisclosures(false), 0);

  const mockCards = mockCongressFallback.map(renderMockDisclosureCard).join("");

  return `
    <header class="app-header">
      <div>
        <p class="eyebrow">Public Disclosure Layer</p>
        <h1>Congress Disclosures</h1>
        <p class="subtitle">
          Disclosure pubbliche reali da fonte esterna, persistite in Supabase,
          con lettura descrittiva e limiti espliciti su ritardi, importi in range
          ed entity resolution.
        </p>
      </div>
    </header>

    <section class="panel">
      <div class="panel-header">
        <div>
          <h2>Congress Disclosures reali</h2>
          <p>
            Apertura normale: lettura da Supabase. Bottone “Aggiorna dati reali”:
            refresh da FMP e persistenza su Supabase.
          </p>
        </div>
      </div>

      <section class="selector-section">
        <p class="selector-label">Ticker</p>
        <div class="symbol-selector">
          ${congressSymbols.map(renderSymbolButton).join("")}
        </div>
      </section>

      <section class="selector-section">
        <p class="selector-label">Chamber</p>
        <div class="symbol-selector">
          ${congressChambers.map(renderChamberButton).join("")}
        </div>
      </section>

      <section class="peer-actions-row">
        <button
          class="button"
          type="button"
          onclick="loadRealCongressDisclosures(false)"
          ${congressLoading ? "disabled" : ""}
        >
          Leggi da Supabase
        </button>

        <button
          class="secondary-button"
          type="button"
          onclick="loadRealCongressDisclosures(true)"
          ${congressLoading ? "disabled" : ""}
        >
          Aggiorna dati reali
        </button>
      </section>

      <div id="congress-disclosures-status" class="description-box">
        Caricamento disclosure Congresso...
      </div>

      <div id="congress-disclosures-real-content"></div>

      <section class="detail-section">
        <h3>Fallback mock educativo</h3>
        <p class="muted-text">
          Le disclosure hanno limiti strutturali: importi in range, ritardi di pubblicazione,
          possibili errori di mapping ticker/asset e nessuna inferenza sulle intenzioni.
        </p>
        <div class="stack">
          ${mockCards}
        </div>
      </section>
    </section>
  `;
}

function renderSymbolButton(symbol) {
  const activeClass = selectedCongressSymbol === symbol ? "symbol-button--active" : "";

  return `
    <button
      class="symbol-button ${activeClass}"
      type="button"
      onclick="selectCongressSymbol('${symbol}')"
    >
      ${symbol}
    </button>
  `;
}

function renderChamberButton(chamber) {
  const activeClass = selectedCongressChamber === chamber.id ? "symbol-button--active" : "";

  return `
    <button
      class="symbol-button ${activeClass}"
      type="button"
      onclick="selectCongressChamber('${chamber.id}')"
    >
      ${chamber.label}
    </button>
  `;
}

window.selectCongressSymbol = function selectCongressSymbol(symbol) {
  selectedCongressSymbol = symbol;
  updateCongressButtons();
  loadRealCongressDisclosures(false);
};

window.selectCongressChamber = function selectCongressChamber(chamber) {
  selectedCongressChamber = chamber;
  updateCongressButtons();
  loadRealCongressDisclosures(false);
};

window.loadRealCongressDisclosures = async function loadRealCongressDisclosures(refresh = false) {
  const statusEl = document.querySelector("#congress-disclosures-status");
  const contentEl = document.querySelector("#congress-disclosures-real-content");

  if (!statusEl || !contentEl) {
    return;
  }

  congressLoading = true;
  congressLastMode = refresh ? "refresh" : "cache";

  statusEl.innerHTML = `
    <p>
      ${refresh ? "Aggiornamento da FMP e persistenza Supabase" : "Lettura da Supabase"}
      per <strong>${selectedCongressSymbol}</strong>
      (${selectedCongressChamber})...
    </p>
  `;

  contentEl.innerHTML = "";

  try {
    const payload = await fetchRealCongressDisclosures({
      symbol: selectedCongressSymbol,
      chamber: selectedCongressChamber,
      limit: 50,
      refresh
    });

    const records = payload?.data?.records || [];

    if (!records.length) {
      statusEl.innerHTML = `
        <p>Nessuna disclosure reale trovata per <strong>${selectedCongressSymbol}</strong>.</p>
      `;
      return;
    }

    statusEl.innerHTML = `
      <p>
        Disclosure reali recuperate: <strong>${records.length}</strong>.
        Completezza: <strong>${payload.data_quality?.completeness_score || 0}%</strong>.
        Fonte lettura: <strong>${payload.data?.source || "n/d"}</strong>.
      </p>
    `;

    contentEl.innerHTML = renderDisclosureTable(payload);
  } catch (error) {
    statusEl.innerHTML = `
      <p><strong>Errore Congress Disclosures:</strong> ${error.message}</p>
      <p>La pagina resta disponibile con fallback mock.</p>
    `;
  } finally {
    congressLoading = false;
  }
};

function renderDisclosureTable(payload) {
  const records = payload.data.records;

  const rows = records
    .map((record) => {
      return `
        <tr>
          <td>${formatValue(record.chamber)}</td>
          <td>${formatValue(record.member_name)}</td>
          <td>${formatValue(record.ticker)}</td>
          <td>${formatValue(record.asset_description)}</td>
          <td>${formatValue(record.transaction_type)}</td>
          <td>${formatValue(record.amount)}</td>
          <td>${formatValue(record.transaction_date)}</td>
          <td>${formatValue(record.disclosure_date)}</td>
          <td>${formatValue(record.reporting_delay_days)}</td>
        </tr>
      `;
    })
    .join("");

  const cards = records.map(renderDisclosureMobileCard).join("");

  return `
    <section class="detail-section">
      <div class="real-data-section-header">
        <div>
          <h3>Disclosure reali</h3>
          <p class="muted-text">
            Fonte lettura: ${formatValue(payload.data?.source)}.
            Chamber: ${formatValue(payload.data?.chamber)}.
          </p>
        </div>

        <span class="quality-badge quality-badge--neutral">
          ${congressLastMode === "refresh" ? "FMP refresh" : "Supabase cache"}
        </span>
      </div>

      <div class="history-table-wrapper history-table-wrapper--desktop">
        <table class="history-table">
          <thead>
            <tr>
              <th>Chamber</th>
              <th>Member</th>
              <th>Ticker</th>
              <th>Asset</th>
              <th>Type</th>
              <th>Amount</th>
              <th>Transaction</th>
              <th>Disclosure</th>
              <th>Delay days</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>

      <div class="daily-history-card-list">
        ${cards}
      </div>

      <section class="audit-box">
        <p><strong>Fonte API:</strong> ${payload.data_quality?.source_id || "financial_modeling_prep"}</p>
        <p><strong>Data as of:</strong> ${formatValue(payload.data_quality?.data_as_of)}</p>
        <p><strong>Disclaimer:</strong> ${payload.disclaimer}</p>
      </section>
    </section>
  `;
}

function renderDisclosureMobileCard(record) {
  return `
    <article class="daily-history-card">
      <div class="daily-history-card__header">
        <div>
          <p class="metric-label">${formatValue(record.chamber)}</p>
          <h3>${formatValue(record.ticker)}</h3>
        </div>

        <span class="quality-badge quality-badge--neutral">
          ${formatValue(record.transaction_type)}
        </span>
      </div>

      <section class="description-box">
        <p><strong>Member:</strong> ${formatValue(record.member_name)}</p>
        <p><strong>Asset:</strong> ${formatValue(record.asset_description)}</p>
        <p><strong>Amount:</strong> ${formatValue(record.amount)}</p>
      </section>

      <div class="daily-history-card__ohlc">
        <div>
          <p class="metric-label">Transaction</p>
          <strong>${formatValue(record.transaction_date)}</strong>
        </div>

        <div>
          <p class="metric-label">Disclosure</p>
          <strong>${formatValue(record.disclosure_date)}</strong>
        </div>

        <div>
          <p class="metric-label">Delay</p>
          <strong>${formatValue(record.reporting_delay_days)}</strong>
        </div>
      </div>
    </article>
  `;
}

function renderMockDisclosureCard(disclosure) {
  return `
    <article class="disclosure-card">
      <h3>${disclosure.memberName}</h3>
      <p>${disclosure.description}</p>
    </article>
  `;
}

function updateCongressButtons() {
  document.querySelectorAll(".symbol-button").forEach((button) => {
    const value = button.textContent.trim();
    const chamber = congressChambers.find((item) => item.label === value);

    button.classList.toggle(
      "symbol-button--active",
      value === selectedCongressSymbol || chamber?.id === selectedCongressChamber
    );
  });
}

function formatValue(value) {
  if (value === null || value === undefined || value === "") {
    return "n/d";
  }

  return value;
}
