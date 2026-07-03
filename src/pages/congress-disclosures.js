import { fetchRealCongressDisclosures } from "../services/congress-disclosures-api.js";
import {
  fetchOfficialHouseFilings,
  fetchOfficialSenateStatus,
  parseOfficialHouseFilingPdf
} from "../services/congress-official-filings-api.js";

let selectedCongressSymbol = "AAPL";
let selectedCongressChamber = "both";
let congressLoading = false;
let congressLastMode = "cache";

let selectedOfficialYear = 2026;
let officialHouseLoading = false;
let officialHouseLastMode = "cache";

const congressSymbols = ["AAPL", "MSFT", "JPM", "NVDA", "AMZN"];

const congressChambers = [
  { id: "both", label: "House + Senate" },
  { id: "house", label: "House" },
  { id: "senate", label: "Senate" }
];

const officialYears = [2026, 2025, 2024];

const mockCongressFallback = [
  {
    memberName: "Mock Disclosure",
    description:
      "Fallback educativo: se il provider non restituisce dati reali, questa sezione ricorda i limiti metodologici delle disclosure."
  }
];

export function renderCongressDisclosuresPage() {
  setTimeout(() => loadRealCongressDisclosures(false), 0);
  setTimeout(() => loadOfficialHouseFilings(false), 0);

  const mockCards = mockCongressFallback.map(renderMockDisclosureCard).join("");

  return `
    <header class="app-header">
      <div>
        <p class="eyebrow">Public Disclosure Layer</p>
        <h1>Congress Disclosures</h1>
        <p class="subtitle">
          Disclosure pubbliche e filing ufficiali. La sezione provider può non essere
          disponibile con il piano API attuale; la sezione Official House Filings usa
          invece fonte ufficiale House persistita in Supabase.
        </p>
      </div>
    </header>

    <section class="panel">
      <div class="panel-header">
        <div>
          <h2>Congress Trades Provider</h2>
          <p>
            Apertura normale: lettura da Supabase. Bottone “Aggiorna dati reali”:
            refresh da provider e persistenza su Supabase, se il dataset è disponibile.
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

      ${renderOfficialHouseFilingsSection()}

      <div id="congress-disclosures-status" class="description-box">
        Caricamento disclosure provider...
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

function renderOfficialHouseFilingsSection() {
  return `
    <section class="detail-section official-house-filings-section">
      <div class="real-data-section-header">
        <div>
          <p class="eyebrow">Official Source Layer</p>
          <h3>Official House Filings</h3>
          <p class="muted-text">
            Indice ufficiale House dei filing finanziari. V1 indicizza i filing PTR e
            conserva document URL, doc ID, filer, filing date e fonte.
          </p>
        </div>

        <span class="quality-badge quality-badge--neutral">
          House official
        </span>
      </div>

      <section class="selector-section">
        <p class="selector-label">Filing year</p>
        <div class="symbol-selector">
          ${officialYears.map(renderOfficialYearButton).join("")}
        </div>
      </section>

      <section class="peer-actions-row">
        <button
          class="button"
          type="button"
          onclick="loadOfficialHouseFilings(false)"
          ${officialHouseLoading ? "disabled" : ""}
        >
          Leggi filing ufficiali da Supabase
        </button>

        <button
          class="secondary-button"
          type="button"
          onclick="loadOfficialHouseFilings(true)"
          ${officialHouseLoading ? "disabled" : ""}
        >
          Aggiorna filing ufficiali House
        </button>

        <button
          class="secondary-button"
          type="button"
          onclick="loadOfficialSenateStatus()"
        >
          Stato fonte Senate
        </button>
      </section>

      <div id="official-house-filings-status" class="description-box">
        Caricamento filing ufficiali House...
      </div>

      <div id="official-house-pdf-parser-status"></div>

      <div id="official-house-filings-content"></div>
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

function renderOfficialYearButton(year) {
  const activeClass = selectedOfficialYear === year ? "symbol-button--active" : "";

  return `
    <button
      class="symbol-button ${activeClass}"
      type="button"
      onclick="selectOfficialHouseYear(${year})"
    >
      ${year}
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

window.selectOfficialHouseYear = function selectOfficialHouseYear(year) {
  selectedOfficialYear = Number(year);
  updateCongressButtons();
  loadOfficialHouseFilings(false);
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
      ${refresh ? "Aggiornamento provider e persistenza Supabase" : "Lettura da Supabase"}
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
      const availability = payload?.data?.availability;

      if (availability?.status === "provider_plan_required") {
        statusEl.innerHTML = `
          <p>
            <strong>Dataset Congress provider non disponibile con il piano API attuale.</strong>
          </p>
          <p>
            Usa la sezione Official House Filings sopra per caricare i filing ufficiali House.
          </p>
        `;

        contentEl.innerHTML = renderCongressProviderUnavailable(payload);
        return;
      }

      statusEl.innerHTML = `
        <p>Nessuna disclosure provider trovata per <strong>${selectedCongressSymbol}</strong>.</p>
      `;
      return;
    }

    statusEl.innerHTML = `
      <p>
        Disclosure provider recuperate: <strong>${records.length}</strong>.
        Completezza: <strong>${payload.data_quality?.completeness_score || 0}%</strong>.
        Fonte lettura: <strong>${payload.data?.source || "n/d"}</strong>.
      </p>
    `;

    contentEl.innerHTML = renderDisclosureTable(payload);
  } catch (error) {
    statusEl.innerHTML = `
      <p><strong>Errore Congress Disclosures:</strong> ${error.message}</p>
      <p>La pagina resta disponibile con fallback mock e con Official House Filings.</p>
    `;
  } finally {
    congressLoading = false;
  }
};

window.loadOfficialHouseFilings = async function loadOfficialHouseFilings(refresh = false) {
  const statusEl = document.querySelector("#official-house-filings-status");
  const contentEl = document.querySelector("#official-house-filings-content");

  if (!statusEl || !contentEl) {
    return;
  }

  officialHouseLoading = true;
  officialHouseLastMode = refresh ? "refresh" : "cache";

  statusEl.innerHTML = `
    <p>
      ${refresh ? "Aggiornamento da ZIP ufficiale House" : "Lettura da Supabase"}
      per filing year <strong>${selectedOfficialYear}</strong>...
    </p>
  `;

  contentEl.innerHTML = "";

  try {
    const payload = await fetchOfficialHouseFilings({
      year: selectedOfficialYear,
      filingType: "P",
      limit: 50,
      refresh
    });

    const records = payload?.data?.records || [];

    if (!records.length) {
      statusEl.innerHTML = `
        <p>Nessun filing ufficiale House trovato per ${selectedOfficialYear}.</p>
      `;
      return;
    }

    statusEl.innerHTML = `
      <p>
        Filing ufficiali House caricati: <strong>${records.length}</strong>.
        Fonte: <strong>${payload.data?.source || "n/d"}</strong>.
        Completezza: <strong>${payload.data_quality?.completeness_score || 0}%</strong>.
      </p>
    `;

    contentEl.innerHTML = renderOfficialHouseFilingsTable(payload);
  } catch (error) {
    statusEl.innerHTML = `
      <p><strong>Errore official House filings:</strong> ${error.message}</p>
      <p>
        Se il problema riguarda lo ZIP, verifica che il link ufficiale 2026FD.zip
        sia raggiungibile o configurato come env var.
      </p>
    `;
  } finally {
    officialHouseLoading = false;
  }
};

window.loadOfficialSenateStatus = async function loadOfficialSenateStatus() {
  const statusEl = document.querySelector("#official-house-filings-status");
  const contentEl = document.querySelector("#official-house-filings-content");

  if (!statusEl || !contentEl) {
    return;
  }

  statusEl.innerHTML = `<p>Caricamento stato fonte ufficiale Senate...</p>`;
  contentEl.innerHTML = "";

  try {
    const payload = await fetchOfficialSenateStatus({
      year: selectedOfficialYear,
      filingType: "P",
      limit: 50
    });

    statusEl.innerHTML = `
      <p>
        Stato fonte Senate recuperato.
        Parser status: <strong>${payload.data?.parser_status || "n/d"}</strong>.
      </p>
    `;

    contentEl.innerHTML = renderOfficialSenateStatus(payload);
  } catch (error) {
    statusEl.innerHTML = `
      <p><strong>Errore stato Senate:</strong> ${error.message}</p>
    `;
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
          <h3>Provider disclosures</h3>
          <p class="muted-text">
            Fonte lettura: ${formatValue(payload.data?.source)}.
            Chamber: ${formatValue(payload.data?.chamber)}.
          </p>
        </div>

        <span class="quality-badge quality-badge--neutral">
          ${congressLastMode === "refresh" ? "Provider refresh" : "Supabase cache"}
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

function renderOfficialHouseFilingsTable(payload) {
  const records = payload.data.records;

  const rows = records
    .map((record) => {
      const documentLink = record.document_url
        ? `${record.document_url}Apri PDF</a>`
        : "n/d";

      return `
        <tr>
          <td>${formatValue(record.filing_date)}</td>
          <td>${formatValue(record.doc_id)}</td>
          <td>${formatValue(record.filer_last_name)}</td>
          <td>${formatValue(record.filer_first_name)}</td>
          <td>${formatValue(record.filing_type_label)}</td>
          <td>${documentLink}</td>
        </tr>
      `;
    })
    .join("");

  const cards = records.map(renderOfficialHouseFilingCard).join("");

  return `
    <section class="official-filings-result">
      <div class="real-data-section-header">
        <div>
          <h3>Filing ufficiali House</h3>
          <p class="muted-text">
            Fonte lettura: ${formatValue(payload.data?.source)}.
            Modalità: ${officialHouseLastMode === "refresh" ? "ZIP ufficiale refresh" : "Supabase cache"}.
          </p>
        </div>

        <span class="quality-badge quality-badge--neutral">
          ${payload.data?.records_count || 0} filing
        </span>
      </div>

      <div class="history-table-wrapper history-table-wrapper--desktop">
        <table class="history-table">
          <thead>
            <tr>
              <th>Filing date</th>
              <th>Doc ID</th>
              <th>Last name</th>
              <th>First name</th>
              <th>Type</th>
              <th>Document</th>
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
        <p><strong>Fonte:</strong> ${formatValue(payload.data_quality?.source_id)}</p>
        <p><strong>Data as of:</strong> ${formatValue(payload.data_quality?.data_as_of)}</p>
        <p><strong>Disclaimer:</strong> ${payload.disclaimer}</p>
      </section>
    </section>
  `;
}

function renderOfficialHouseFilingCard(record) {
  const memberName = `${record.filer_first_name || ""} ${record.filer_last_name || ""}`.trim();

  const documentLink = record.document_url
    ? `
      ${escapeHtmlAttribute(record.document_url)}
        Apri documento ufficiale
      </a>
    `
    : "";

  return `
    <article class="daily-history-card">
      <div class="daily-history-card__header">
        <div>
          <p class="metric-label">Doc ID</p>
          <h3>${formatValue(record.doc_id)}</h3>
        </div>

        <span class="quality-badge quality-badge--neutral">
          ${formatValue(record.filing_type)}
        </span>
      </div>

      <section class="description-box">
        <p><strong>Filer:</strong> ${formatValue(record.filer_first_name)} ${formatValue(record.filer_last_name)}</p>
        <p><strong>Filing date:</strong> ${formatValue(record.filing_date)}</p>
        <p><strong>Type:</strong> ${formatValue(record.filing_type_label)}</p>
      </section>

      ${documentLink}

      <button
        class="secondary-button official-pdf-parse-button"
        type="button"
        data-doc-id="${escapeHtmlAttribute(record.doc_id)}"
        data-document-url="${escapeHtmlAttribute(record.document_url)}"
        data-member-name="${escapeHtmlAttribute(memberName)}"
        data-filing-date="${escapeHtmlAttribute(record.filing_date)}"
        data-filing-year="${escapeHtmlAttribute(record.filing_year)}"
      >
        Estrai transazioni PDF
      </button>
    </article>
  `;
}

function renderOfficialSenateStatus(payload) {
  return `
    <section class="detail-section">
      <div class="real-data-section-header">
        <div>
          <h3>Senate official status</h3>
          <p class="muted-text">
            Fonte ufficiale Senate registrata, parser automatico non implementato in V1.
          </p>
        </div>

        <span class="quality-badge quality-badge--warning">
          ${formatValue(payload.data?.parser_status)}
        </span>
      </div>

      <section class="note-box">
        ${payload.disclaimer}
      </section>
    </section>
  `;
}

function renderCongressProviderUnavailable(payload) {
  const warnings = payload?.data?.warnings || [];

  const warningRows = warnings.length
    ? warnings
        .map((warning) => {
          return `
            <li>
              ${formatValue(warning.chamber || warning.source_id)}:
              ${formatValue(warning.message || warning.error)}
            </li>
          `;
        })
        .join("")
    : "<li>Provider ha restituito dataset non disponibile.</li>";

  return `
    <section class="detail-section congress-provider-unavailable">
      <div class="real-data-section-header">
        <div>
          <h3>Dataset provider non disponibile</h3>
          <p class="muted-text">
            Il provider non rende disponibili questi dati con il piano/API key attuale.
          </p>
        </div>

        <span class="quality-badge quality-badge--warning">
          Provider unavailable
        </span>
      </div>

      <section class="audit-box">
        <p><strong>Dettaglio:</strong></p>
        <ul>
          ${warningRows}
        </ul>
      </section>

      <section class="note-box">
        Usa la sezione Official House Filings sopra per caricare dati dai filing ufficiali House.
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
    const year = Number(value);

    button.classList.toggle(
      "symbol-button--active",
      value === selectedCongressSymbol ||
        chamber?.id === selectedCongressChamber ||
        year === selectedOfficialYear
    );
  });
}

function formatValue(value) {
  if (value === null || value === undefined || value === "") {
    return "n/d";
  }

  return value;
}

window.parseOfficialHousePdfFromUi = async function parseOfficialHousePdfFromUi(
  docId,
  documentUrl,
  memberName,
  filingDate,
  filingYear
) {
  const statusEl = document.querySelector("#official-house-pdf-parser-status");

  if (!statusEl) {
    return;
  }

  statusEl.innerHTML = `
    <section class="description-box">
      <p>
        Estrazione transazioni dal PDF ufficiale House in corso.
        Doc ID: <strong>${formatValue(docId)}</strong>.
      </p>
    </section>
  `;

  try {
    const payload = await parseOfficialHouseFilingPdf({
      docId,
      documentUrl,
      memberName,
      filingDate,
      filingYear,
      persist: true,
      limit: 50
    });

    const recordsCount = payload?.data?.records_count || 0;
    const upserted = payload?.persistence?.upserted || 0;
    const notes = payload?.data?.parser_notes || [];

    statusEl.innerHTML = `
      <section class="detail-section official-pdf-parser-result">
        <div class="real-data-section-header">
          <div>
            <p class="eyebrow">PDF Transaction Parser</p>
            <h3>Estrazione completata</h3>
            <p class="muted-text">
              Record estratti: ${recordsCount}. Record persistiti:
              ${upserted}.
            </p>
          </div>

          <span class="quality-badge quality-badge--neutral">
            PDF parser V1
          </span>
        </div>

        <section class="note-box">
          ${
            notes.length
              ? notes.map((note) => `<p>${note}</p>`).join("")
              : "<p>Nessuna nota parser disponibile.</p>"
          }
        </section>

        <section class="audit-box">
          <p>
            Le transazioni estratte sono state inserite in
            <code>congress_disclosures</code> se il parser ha individuato righe compatibili.
          </p>
        </section>
      </section>
    `;
  } catch (error) {
    statusEl.innerHTML = `
      <section class="audit-box">
        <p><strong>Errore parser PDF House:</strong> ${error.message}</p>
        <p>
          Il PDF potrebbe avere layout non testuale, tabella non standard o richiedere OCR/parser dedicato.
        </p>
      </section>
    `;
  }
};

function formatJsString(value) {
  return String(value || "")
    .replaceAll("\\", "\\\\")
    .replaceAll("'", "\\'")
    .replaceAll("\n", " ")
    .replaceAll("\r", " ");
}

if (typeof window !== "undefined" && !window.__officialHousePdfParserBound) {
  window.__officialHousePdfParserBound = true;

  document.addEventListener("click", (event) => {
    const button = event.target.closest(".official-pdf-parse-button");

    if (!button) {
      return;
    }

    event.preventDefault();

    window.parseOfficialHousePdfFromUi(
      button.dataset.docId,
      button.dataset.documentUrl,
      button.dataset.memberName,
      button.dataset.filingDate,
      button.dataset.filingYear
    );
  });
}

window.parseOfficialHousePdfFromUi = async function parseOfficialHousePdfFromUi(
  docId,
  documentUrl,
  memberName,
  filingDate,
  filingYear
) {
  const statusEl = document.querySelector("#official-house-pdf-parser-status");

  if (!statusEl) {
    return;
  }

  statusEl.scrollIntoView({
    behavior: "smooth",
    block: "center"
  });

  statusEl.innerHTML = `
    <section class="description-box">
      <p>
        Estrazione transazioni dal PDF ufficiale House in corso.
        Doc ID: <strong>${formatValue(docId)}</strong>.
      </p>
      <p class="muted-text">
        Documento: ${formatValue(documentUrl)}
      </p>
    </section>
  `;

  try {
    const payload = await parseOfficialHouseFilingPdf({
      docId,
      documentUrl,
      memberName,
      filingDate,
      filingYear,
      persist: true,
      limit: 50
    });

    const recordsCount = payload?.data?.records_count || 0;
    const upserted = payload?.persistence?.upserted || 0;
    const notes = payload?.data?.parser_notes || [];

    statusEl.innerHTML = `
      <section class="detail-section official-pdf-parser-result">
        <div class="real-data-section-header">
          <div>
            <p class="eyebrow">PDF Transaction Parser</p>
            <h3>Estrazione completata</h3>
            <p class="muted-text">
              Record estratti: <strong>${recordsCount}</strong>.
              Record persistiti: <strong>${upserted}</strong>.
            </p>
          </div>

          <span class="quality-badge quality-badge--neutral">
            PDF parser V1
          </span>
        </div>

        <section class="note-box">
          ${
            notes.length
              ? notes.map((note) => `<p>${note}</p>`).join("")
              : "<p>Nessuna nota parser disponibile.</p>"
          }
        </section>

        <section class="audit-box">
          <p>
            Le transazioni estratte sono state inserite in
            <code>congress_disclosures</code> se il parser ha individuato righe compatibili.
          </p>
        </section>
      </section>
    `;
  } catch (error) {
    statusEl.innerHTML = `
      <section class="audit-box">
        <p><strong>Errore parser PDF House:</strong> ${error.message}</p>
        <p>
          Il PDF potrebbe avere layout non testuale, tabella non standard o richiedere OCR/parser dedicato.
        </p>
      </section>
    `;
  }
};

function escapeHtmlAttribute(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
