import { getRealDataStatus } from "../state/real-data-status.js";
import { fetchDataQualityOverview } from "../services/data-quality-api.js";
import {
  runDailyHistoryUpdate,
  runDetectTechnicalPatterns
} from "../services/operations-api.js";
import {
  getManualOperationsLog,
  addManualOperationLogEntry,
  clearManualOperationsLog
} from "../state/manual-operations-log.js";

const overviewCards = [
  {
    title: "Market Dashboard",
    eyebrow: "Securities",
    description:
      "Consulta una lista di titoli azionari con settore, industria, fonte, qualità dati e quote reali on-demand.",
    primaryActionLabel: "Apri Dashboard",
    primaryView: "dashboard",
    meta: "Titoli · Fonte · Completezza"
  },
  {
    title: "Peer & Fundamentals",
    eyebrow: "Comparables",
    description:
      "Visualizza confronti descrittivi tra singoli titoli e peer group, con metrica, mediana, scostamento e limiti.",
    primaryActionLabel: "Apri Peer Compare",
    primaryView: "peer-compare",
    meta: "Metriche · Mediana · Limiti"
  },
  {
    title: "Technical & Disclosures",
    eyebrow: "Patterns / Public Data",
    description:
      "Esplora pattern tecnici descrittivi e disclosure pubbliche mock, senza generare segnali o raccomandazioni.",
    primaryActionLabel: "Apri Technical Patterns",
    primaryView: "technical-patterns",
    secondaryActionLabel: "Apri Congress Disclosures",
    secondaryView: "congress-disclosures",
    meta: "Pattern · Disclosure · Ritardi"
  },
  {
    title: "Data Quality & Governance",
    eyebrow: "Trust Layer",
    description:
      "Controlla freschezza, completezza, fonte, data di riferimento e problemi noti dei dataset mock e reali.",
    primaryActionLabel: "Apri Data Quality",
    primaryView: "data-quality",
    meta: "Freshness · Completeness · Audit"
  }
];

function renderManualOperationsShell() {
  return `
    <section class="manual-operations-card">
      <div class="manual-operations-card__header">
        <div>
          <p class="eyebrow">Manual Operations</p>
          <h3>Job manuali Supabase</h3>
          <p class="muted-text">
            Avvia manualmente i job backend già esistenti per aggiornare storico prezzi
            e pattern tecnici. Non vengono create nuove API.
          </p>
        </div>

        <span class="quality-badge quality-badge--neutral">
          Manual
        </span>
      </div>

      <div class="manual-operations-form">
        <label>
          <span>CRON_SECRET</span>
          <input
            id="manual-operation-secret"
            class="manual-operation-input"
            type="password"
            placeholder="Incolla CRON_SECRET"
            autocomplete="off"
          />
        </label>

        <label>
          <span>Symbols</span>
          <input
            id="manual-operation-symbols"
            class="manual-operation-input"
            type="text"
            value="AAPL,MSFT,JPM,NVDA,AMZN"
          />
        </label>

        <label>
          <span>Days storico</span>
          <input
            id="manual-operation-days"
            class="manual-operation-input"
            type="number"
            min="1"
            max="60"
            value="30"
          />
        </label>

        <label>
          <span>Pattern limit</span>
          <input
            id="manual-operation-limit"
            class="manual-operation-input"
            type="number"
            min="20"
            max="1000"
            value="260"
          />
        </label>
      </div>

      <label class="manual-operation-confirmation">
        <input
          id="manual-operation-confirm"
          type="checkbox"
        />
        <span>
          Confermo di voler eseguire manualmente job backend usando il CRON_SECRET inserito.
        </span>
      </label>

      <div class="manual-operations-actions">
        <button
          class="button"
          type="button"
          onclick="runManualHistoryJob()"
        >
          Aggiorna storico
        </button>

        <button
          class="secondary-button"
          type="button"
          onclick="runManualPatternJob()"
        >
          Calcola pattern
        </button>

        <button
          class="secondary-button"
          type="button"
          onclick="runFullManualPipeline()"
        >
          Esegui pipeline completa
        </button>

        <button
          class="secondary-button manual-operations-reset-button"
          type="button"
          onclick="resetManualOperationsForm()"
        >
          Pulisci secret / Reset form
        </button>
      </div>

      <div id="manual-operations-status" class="description-box">
        Nessun job manuale lanciato in questa vista.
      </div>

      <div id="manual-operations-result"></div>

      <section class="manual-operations-log-card">
        <div class="manual-operations-log-card__header">
          <div>
            <p class="eyebrow">Execution Log</p>
            <h3>Ultimi job manuali</h3>
          </div>

          <button
            class="secondary-button"
            type="button"
            onclick="clearManualOperationsLogView()"
          >
            Pulisci log
          </button>
        </div>

        <div id="manual-operations-log">
          ${renderManualOperationsLog(getManualOperationsLog())}
        </div>
      </section>

      <section class="audit-box">
        <p>
          <strong>Nota sicurezza:</strong>
          il CRON_SECRET viene usato solo nella richiesta manuale dal browser.
          Non inserirlo nel codice sorgente e non committarlo su GitHub.
        </p>
      </section>
    </section>
  `;
}



function renderOverviewCard(card) {
  const secondaryButton = card.secondaryActionLabel
    ? `
      <button
        class="overview-card__secondary-button"
        type="button"
        onclick="navigateTo('${card.secondaryView}')"
      >
        ${card.secondaryActionLabel}
      </button>
    `
    : "";

  return `
    <article class="overview-card">
      <div class="overview-card__content">
        <p class="eyebrow">${card.eyebrow}</p>
        <h3>${card.title}</h3>
        <p>${card.description}</p>
      </div>

      <div class="overview-card__footer">
        <span class="overview-card__meta">${card.meta}</span>

        <div class="overview-card__actions">
          <button
            class="overview-card__button"
            type="button"
            onclick="navigateTo('${card.primaryView}')"
          >
            ${card.primaryActionLabel}
          </button>

          ${secondaryButton}
        </div>
      </div>
    </article>
  `;
}

function getRealDataStatusBadgeClass(status) {
  if (status.status === "loaded") {
    return "quality-badge--ok";
  }

  if (status.status === "loading") {
    return "quality-badge--neutral";
  }

  if (status.status === "error") {
    return "quality-badge--danger";
  }

  return "quality-badge--warning";
}

function renderRealDataStatusIndicator() {
  const realDataStatus = getRealDataStatus();
  const badgeClass = getRealDataStatusBadgeClass(realDataStatus);
  const symbolsText =
    realDataStatus.loadedSymbols && realDataStatus.loadedSymbols.length
      ? realDataStatus.loadedSymbols.join(", ")
      : "nessun ticker reale caricato";

  return `
    <section class="real-data-status-card">
      <div class="real-data-status-card__header">
        <div>
          <p class="eyebrow">Real Data Layer</p>
          <h3>Stato dati reali</h3>
        </div>

        <span class="quality-badge ${badgeClass}">
          ${realDataStatus.label}
        </span>
      </div>

      <div class="real-data-status-grid">
        <div>
          <p class="metric-label">Provider</p>
          <strong>${realDataStatus.provider || "none"}</strong>
        </div>

        <div>
          <p class="metric-label">Fonte</p>
          <strong>${realDataStatus.sourceId || "mock"}</strong>
        </div>

        <div>
          <p class="metric-label">Ticker caricati</p>
          <strong>${symbolsText}</strong>
        </div>

        <div>
          <p class="metric-label">Ultimo aggiornamento</p>
          <strong>${realDataStatus.lastUpdatedAt || "n/d"}</strong>
        </div>
      </div>

      <section class="audit-box">
        <p><strong>Messaggio:</strong> ${realDataStatus.message}</p>
      </section>
    </section>
  `;
}

function renderMarketSnapshotShell() {
  return `
    <section class="market-snapshot-card">
      <div class="market-snapshot-card__header">
        <div>
          <p class="eyebrow">Market Snapshot</p>
          <h3>Stato backend Supabase</h3>
          <p class="muted-text">
            Sintesi dei dati storici, pattern tecnici e ingestion run già presenti
            nel data layer persistente.
          </p>
        </div>

        <button
          class="secondary-button market-snapshot-card__button"
          type="button"
          onclick="loadMarketSnapshot()"
        >
          Aggiorna snapshot
        </button>
      </div>

      <div id="market-snapshot-status" class="description-box">
        Snapshot non ancora caricato in questa vista.
      </div>

      <div id="market-snapshot-content">
        ${renderEmptyMarketSnapshot()}
      </div>
    </section>
  `;
}

function renderOperationsChecklistShell() {
  return `
    <section class="operations-checklist-card">
      <div class="operations-checklist-card__header">
        <div>
          <p class="eyebrow">Operations Checklist</p>
          <h3>Stato operativo backend</h3>
          <p class="muted-text">
            Checklist descrittiva dei blocchi necessari per mantenere aggiornato
            il data layer: storico, pattern, ingestion runs e data quality log.
          </p>
        </div>

        <span id="operations-checklist-badge" class="quality-badge quality-badge--neutral">
          Non verificato
        </span>
      </div>

      <div id="operations-checklist-content">
        ${renderEmptyOperationsChecklist()}
      </div>
    </section>
  `;
}

function renderEmptyOperationsChecklist() {
  return `
    <div class="operations-checklist-grid">
      <article class="operation-check-card">
        <span class="operation-check-card__dot operation-check-card__dot--neutral"></span>
        <div>
          <p class="metric-label">Storico prezzi</p>
          <h3>n/d</h3>
          <p>Dati non ancora verificati in questa vista.</p>
        </div>
      </article>

      <article class="operation-check-card">
        <span class="operation-check-card__dot operation-check-card__dot--neutral"></span>
        <div>
          <p class="metric-label">Pattern tecnici</p>
          <h3>n/d</h3>
          <p>Pattern non ancora verificati in questa vista.</p>
        </div>
      </article>

      <article class="operation-check-card">
        <span class="operation-check-card__dot operation-check-card__dot--neutral"></span>
        <div>
          <p class="metric-label">Ingestion runs</p>
          <h3>n/d</h3>
          <p>Job non ancora verificati in questa vista.</p>
        </div>
      </article>

      <article class="operation-check-card">
        <span class="operation-check-card__dot operation-check-card__dot--neutral"></span>
        <div>
          <p class="metric-label">Data quality log</p>
          <h3>n/d</h3>
          <p>Log qualità dati non ancora verificato.</p>
        </div>
      </article>
    </div>
  `;
}



function renderEmptyMarketSnapshot() {
  return `
    <div class="market-snapshot-grid">
      <article class="metric-card">
        <p class="metric-label">Titoli con storico</p>
        <h3>n/d</h3>
      </article>

      <article class="metric-card">
        <p class="metric-label">Record storici</p>
        <h3>n/d</h3>
      </article>

      <article class="metric-card">
        <p class="metric-label">Titoli con pattern</p>
        <h3>n/d</h3>
      </article>

      <article class="metric-card">
        <p class="metric-label">Pattern disponibili</p>
        <h3>n/d</h3>
      </article>

      <article class="metric-card">
        <p class="metric-label">Ultimo ingestion run</p>
        <h3>n/d</h3>
      </article>

      <article class="metric-card">
        <p class="metric-label">Stato ultimo run</p>
        <h3>n/d</h3>
      </article>
    </div>
  `;
}

export function renderHomeOverviewPage() {
  setTimeout(loadMarketSnapshot, 0);

  const cards = overviewCards.map(renderOverviewCard).join("");

  return `
    <header class="app-header">
      <div>
        <p class="eyebrow">Educational Market Intelligence</p>
        <h1>Home Overview</h1>
        <p class="subtitle">
          Vista iniziale della Market Intelligence App. Le aree sotto
          riassumono il frontend, il Real Data Layer e lo stato del backend Supabase.
        </p>
      </div>
    </header>

    <section class="home-hero panel">
      <div>
        <p class="eyebrow">Cloud-only MVP</p>
        <h2>Frontend mock + Supabase data layer</h2>
        <p>
          Questa versione usa GitHub, Codespaces, Vercel e Supabase. I dati mock restano
          disponibili come fallback, mentre storico, pattern tecnici e data quality
          vengono progressivamente letti dal backend persistente.
        </p>
      </div>

      <div class="home-hero__status">
        <span class="quality-badge quality-badge--ok">Single API Router</span>
        <span class="quality-badge quality-badge--neutral">Supabase</span>
        <span class="quality-badge quality-badge--warning">On-demand</span>
      </div>
    </section>

    ${renderRealDataStatusIndicator()}

    ${renderMarketSnapshotShell()}

    ${renderOperationsChecklistShell()}

    ${renderManualOperationsShell()}

    <section class="overview-grid">
      ${cards}
    </section>

    <section class="note-box">
      <strong>Regola prodotto:</strong>
      questa app ha finalità esclusivamente informativa ed educativa. Le sezioni
      mostrano dati descrittivi, qualità, fonte e limiti, senza raccomandazioni
      operative o segnali di trading.
    </section>
  `;
}

window.loadMarketSnapshot = async function loadMarketSnapshot() {
  const statusEl = document.querySelector("#market-snapshot-status");
  const contentEl = document.querySelector("#market-snapshot-content");

  if (!statusEl || !contentEl) {
    return;
  }

  statusEl.innerHTML = `
    <p>Caricamento Market Snapshot da Supabase...</p>
  `;

  try {
    const payload = await fetchDataQualityOverview();
    const data = payload.data;

    const snapshot = buildMarketSnapshot(data);

    statusEl.innerHTML = `
      <p>
        Market Snapshot aggiornato da Supabase.
        Generated at: <strong>${formatValue(data.generated_at)}</strong>.
      </p>
    `;

    contentEl.innerHTML = renderMarketSnapshot(snapshot);
    updateOperationsChecklist(data);
  } catch (error) {
    statusEl.innerHTML = `
      <p><strong>Errore caricamento Market Snapshot:</strong> ${error.message}</p>
      <p>
        La Home resta disponibile. Verifica <code>/api/market/data-quality-db</code>,
        Supabase e il singolo router Vercel.
      </p>
    `;

    contentEl.innerHTML = renderEmptyMarketSnapshot();
    resetOperationsChecklistOnError();
  }
};

function buildMarketSnapshot(data) {
  const priceRows = data?.price_history_summary?.rows || [];
  const patternSummaryRows =
    data?.technical_patterns_summary?.summary_by_ticker || [];
  const patternRows = data?.technical_patterns_summary?.rows || [];
  const ingestionRuns = data?.latest_ingestion_runs?.rows || [];

  const latestIngestionRun = ingestionRuns[0] || null;

  const totalHistoricalRecords = priceRows.reduce((sum, row) => {
    return sum + Number(row.records_count || 0);
  }, 0);

  const totalPatterns = patternSummaryRows.reduce((sum, row) => {
    return sum + Number(row.patterns_count || 0);
  }, 0);

  const latestHistoryDate = priceRows.reduce((latest, row) => {
    if (!row.latest_date) {
      return latest;
    }

    if (!latest || new Date(row.latest_date) > new Date(latest)) {
      return row.latest_date;
    }

    return latest;
  }, null);

  const latestPatternComputedAt = patternRows.reduce((latest, row) => {
    if (!row.computed_at) {
      return latest;
    }

    if (!latest || new Date(row.computed_at) > new Date(latest)) {
      return row.computed_at;
    }

    return latest;
  }, null);

  return {
    securitiesWithHistory: priceRows.length,
    totalHistoricalRecords,
    securitiesWithPatterns: patternSummaryRows.length,
    totalPatterns,
    latestHistoryDate,
    latestPatternComputedAt,
    latestIngestionJob: latestIngestionRun?.job_name || null,
    latestIngestionStatus: latestIngestionRun?.status || null,
    latestIngestionStartedAt: latestIngestionRun?.started_at || null,
    latestIngestionFinishedAt: latestIngestionRun?.finished_at || null
  };
}

function renderMarketSnapshot(snapshot) {
  const ingestionBadgeClass =
    snapshot.latestIngestionStatus === "completed"
      ? "quality-badge--ok"
      : snapshot.latestIngestionStatus === "completed_with_errors"
        ? "quality-badge--warning"
        : snapshot.latestIngestionStatus
          ? "quality-badge--danger"
          : "quality-badge--neutral";

  return `
    <div class="market-snapshot-grid">
      <article class="metric-card">
        <p class="metric-label">Titoli con storico</p>
        <h3>${formatValue(snapshot.securitiesWithHistory)}</h3>
      </article>

      <article class="metric-card">
        <p class="metric-label">Record storici</p>
        <h3>${formatNumber(snapshot.totalHistoricalRecords)}</h3>
      </article>

      <article class="metric-card">
        <p class="metric-label">Titoli con pattern</p>
        <h3>${formatValue(snapshot.securitiesWithPatterns)}</h3>
      </article>

      <article class="metric-card">
        <p class="metric-label">Pattern disponibili</p>
        <h3>${formatNumber(snapshot.totalPatterns)}</h3>
      </article>

      <article class="metric-card">
        <p class="metric-label">Ultima data storico</p>
        <h3>${formatValue(snapshot.latestHistoryDate)}</h3>
      </article>

      <article class="metric-card">
        <p class="metric-label">Ultimo pattern computed</p>
        <h3>${formatValue(snapshot.latestPatternComputedAt)}</h3>
      </article>
    </div>

    <section class="market-snapshot-ingestion">
      <div>
        <p class="metric-label">Ultimo ingestion run</p>
        <h3>${formatValue(snapshot.latestIngestionJob)}</h3>
        <p class="muted-text">
          Started: ${formatValue(snapshot.latestIngestionStartedAt)}
          · Finished: ${formatValue(snapshot.latestIngestionFinishedAt)}
        </p>
      </div>

      <span class="quality-badge ${ingestionBadgeClass}">
        ${formatValue(snapshot.latestIngestionStatus)}
      </span>
    </section>

    <section class="audit-box">
      <p>
        <strong>Lettura descrittiva:</strong>
        lo snapshot mostra solo disponibilità, freschezza e copertura dei dati.
        Non produce valutazioni finanziarie o segnali operativi.
      </p>
    </section>
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
    maximumFractionDigits: 0
  }).format(numberValue);
}
function buildOperationsChecklist(data) {
  const priceRows = data?.price_history_summary?.rows || [];
  const patternSummaryRows =
    data?.technical_patterns_summary?.summary_by_ticker || [];
  const ingestionRuns = data?.latest_ingestion_runs?.rows || [];
  const qualityLogs = data?.latest_quality_logs?.rows || [];

  const latestIngestionRun = ingestionRuns[0] || null;

  const totalHistoricalRecords = priceRows.reduce((sum, row) => {
    return sum + Number(row.records_count || 0);
  }, 0);

  const totalPatterns = patternSummaryRows.reduce((sum, row) => {
    return sum + Number(row.patterns_count || 0);
  }, 0);

  const historyOk = priceRows.length > 0 && totalHistoricalRecords > 0;
  const patternsOk = patternSummaryRows.length > 0 && totalPatterns > 0;
  const ingestionOk =
    latestIngestionRun?.status === "completed" ||
    latestIngestionRun?.status === "completed_with_errors";
  const qualityLogOk = qualityLogs.length > 0;

  const checks = [
    {
      id: "history",
      title: "Storico prezzi",
      ok: historyOk,
      warning: priceRows.length > 0 && totalHistoricalRecords === 0,
      value: historyOk
        ? `${priceRows.length} titoli / ${totalHistoricalRecords} record`
        : "Non popolato",
      description: historyOk
        ? "La tabella price_history contiene dati storici persistenti."
        : "Esegui il job daily-history-update per popolare price_history."
    },
    {
      id: "patterns",
      title: "Pattern tecnici",
      ok: patternsOk,
      warning: patternSummaryRows.length > 0 && totalPatterns === 0,
      value: patternsOk
        ? `${patternSummaryRows.length} titoli / ${totalPatterns} pattern`
        : "Non popolato",
      description: patternsOk
        ? "La tabella technical_patterns contiene pattern descrittivi calcolati."
        : "Esegui il job detect-technical-patterns dopo aver caricato lo storico."
    },
    {
      id: "ingestion",
      title: "Ingestion runs",
      ok: latestIngestionRun?.status === "completed",
      warning: latestIngestionRun?.status === "completed_with_errors",
      value: latestIngestionRun?.status || "n/d",
      description: latestIngestionRun
        ? `Ultimo job: ${latestIngestionRun.job_name || "n/d"}`
        : "Nessun ingestion run trovato."
    },
    {
      id: "quality",
      title: "Data quality log",
      ok: qualityLogOk,
      warning: false,
      value: qualityLogOk ? `${qualityLogs.length} log recenti` : "Nessun log",
      description: qualityLogOk
        ? "Sono presenti log recenti di qualità dati."
        : "Il data_quality_log non contiene ancora record recenti."
    }
  ];

  const okCount = checks.filter((check) => check.ok).length;
  const warningCount = checks.filter((check) => check.warning).length;

  let overallStatus = "Da verificare";
  let overallClass = "quality-badge--neutral";

  if (okCount === checks.length) {
    overallStatus = "Operativo";
    overallClass = "quality-badge--ok";
  } else if (okCount > 0 || warningCount > 0) {
    overallStatus = "Parziale";
    overallClass = "quality-badge--warning";
  } else {
    overallStatus = "Non pronto";
    overallClass = "quality-badge--danger";
  }

  return {
    checks,
    okCount,
    warningCount,
    overallStatus,
    overallClass
  };
}

function renderOperationsChecklist(checklist) {
  const cards = checklist.checks
    .map((check) => {
      const dotClass = check.ok
        ? "operation-check-card__dot--ok"
        : check.warning
          ? "operation-check-card__dot--warning"
          : "operation-check-card__dot--danger";

      const badgeClass = check.ok
        ? "quality-badge--ok"
        : check.warning
          ? "quality-badge--warning"
          : "quality-badge--danger";

      const label = check.ok ? "OK" : check.warning ? "Parziale" : "Da fare";

      return `
        <article class="operation-check-card">
          <span class="operation-check-card__dot ${dotClass}"></span>

          <div>
            <div class="operation-check-card__title-row">
              <div>
                <p class="metric-label">${check.title}</p>
                <h3>${check.value}</h3>
              </div>

              <span class="quality-badge ${badgeClass}">
                ${label}
              </span>
            </div>

            <p>${check.description}</p>
          </div>
        </article>
      `;
    })
    .join("");

  return `
    <div class="operations-checklist-grid">
      ${cards}
    </div>

    <section class="audit-box">
      <p>
        <strong>Stato complessivo:</strong>
        ${checklist.okCount}/${checklist.checks.length} controlli OK.
        Questa checklist descrive lo stato operativo del backend e non produce
        valutazioni finanziarie o segnali operativi.
      </p>
    </section>
  `;
}

function updateOperationsChecklist(data) {
  const badgeEl = document.querySelector("#operations-checklist-badge");
  const contentEl = document.querySelector("#operations-checklist-content");

  if (!badgeEl || !contentEl) {
    return;
  }

  const checklist = buildOperationsChecklist(data);

  badgeEl.className = `quality-badge ${checklist.overallClass}`;
  badgeEl.textContent = checklist.overallStatus;

  contentEl.innerHTML = renderOperationsChecklist(checklist);
}

function resetOperationsChecklistOnError() {
  const badgeEl = document.querySelector("#operations-checklist-badge");
  const contentEl = document.querySelector("#operations-checklist-content");

  if (!badgeEl || !contentEl) {
    return;
  }

  badgeEl.className = "quality-badge quality-badge--danger";
  badgeEl.textContent = "Errore";

  contentEl.innerHTML = `
    <section class="audit-box">
      <p>
        <strong>Operations Checklist non disponibile:</strong>
        impossibile leggere lo stato operativo da Supabase.
      </p>
    </section>
  `;
}

window.runManualHistoryJob = async function runManualHistoryJob() {
  const params = getManualOperationParams();

  if (!params.ok) {
    updateManualOperationsStatus(params.message, "error");
    return;
  }

  const startedAt = new Date().toISOString();

  updateManualOperationsStatus("Avvio daily-history-update...", "loading");

  try {
    const result = await runDailyHistoryUpdate({
      symbols: params.symbols,
      days: params.days,
      secret: params.secret
    });

    updateManualOperationsStatus("daily-history-update completato.", "success");
    renderManualOperationsResult(result);

    addManualOperationLogEntry({
      jobType: "daily-history-update",
      status: "success",
      symbols: params.symbols,
      message: result?.summary
        ? `OK: ${result.summary.successful_symbols}/${result.summary.requested_symbols} symbols`
        : "Job storico completato.",
      startedAt,
      finishedAt: new Date().toISOString()
    });
    refreshManualOperationsLogView();

    if (typeof window.loadMarketSnapshot === "function") {
      await window.loadMarketSnapshot();
    }
  } catch (error) {
    updateManualOperationsStatus(error.message, "error");

    addManualOperationLogEntry({
      jobType: "daily-history-update",
      status: "error",
      symbols: params.symbols,
      message: error.message,
      startedAt,
      finishedAt: new Date().toISOString()
    });
    refreshManualOperationsLogView();
  }
};

window.runManualPatternJob = async function runManualPatternJob() {
  const params = getManualOperationParams();

  if (!params.ok) {
    updateManualOperationsStatus(params.message, "error");
    return;
  }

  const startedAt = new Date().toISOString();

  updateManualOperationsStatus("Avvio detect-technical-patterns...", "loading");

  try {
    const result = await runDetectTechnicalPatterns({
      symbols: params.symbols,
      limit: params.limit,
      secret: params.secret
    });

    updateManualOperationsStatus("detect-technical-patterns completato.", "success");
    renderManualOperationsResult(result);

    addManualOperationLogEntry({
      jobType: "detect-technical-patterns",
      status: "success",
      symbols: params.symbols,
      message: result?.summary
        ? `Pattern upserted: ${result.summary.total_patterns_upserted}`
        : "Job pattern completato.",
      startedAt,
      finishedAt: new Date().toISOString()
    });
    refreshManualOperationsLogView();

    if (typeof window.loadMarketSnapshot === "function") {
      await window.loadMarketSnapshot();
    }
  } catch (error) {
    updateManualOperationsStatus(error.message, "error");

    addManualOperationLogEntry({
      jobType: "detect-technical-patterns",
      status: "error",
      symbols: params.symbols,
      message: error.message,
      startedAt,
      finishedAt: new Date().toISOString()
    });
    refreshManualOperationsLogView();
  }
};

window.runFullManualPipeline = async function runFullManualPipeline() {
  const params = getManualOperationParams();

  if (!params.ok) {
    updateManualOperationsStatus(params.message, "error");
    return;
  }

  const startedAt = new Date().toISOString();

  updateManualOperationsStatus("Pipeline completa avviata: Step 1 storico prezzi...", "loading");

  try {
    const historyResult = await runDailyHistoryUpdate({
      symbols: params.symbols,
      days: params.days,
      secret: params.secret
    });

    updateManualOperationsStatus(
      "Step 1 completato. Step 2 calcolo pattern tecnici...",
      "loading"
    );

    const patternResult = await runDetectTechnicalPatterns({
      symbols: params.symbols,
      limit: params.limit,
      secret: params.secret
    });

    updateManualOperationsStatus("Pipeline completa terminata.", "success");

    const finishedAt = new Date().toISOString();

    renderManualOperationsResult({
      pipeline: "full-manual-pipeline",
      history: historyResult,
      patterns: patternResult,
      finished_at: finishedAt
    });

    addManualOperationLogEntry({
      jobType: "full-manual-pipeline",
      status: "success",
      symbols: params.symbols,
      message: "Pipeline completa eseguita: storico + pattern.",
      startedAt,
      finishedAt
    });
    refreshManualOperationsLogView();

    if (typeof window.loadMarketSnapshot === "function") {
      await window.loadMarketSnapshot();
    }
  } catch (error) {
    updateManualOperationsStatus(error.message, "error");

    addManualOperationLogEntry({
      jobType: "full-manual-pipeline",
      status: "error",
      symbols: params.symbols,
      message: error.message,
      startedAt,
      finishedAt: new Date().toISOString()
    });
    refreshManualOperationsLogView();
  }
};

function getManualOperationParams() {
  const secretEl = document.querySelector("#manual-operation-secret");
  const symbolsEl = document.querySelector("#manual-operation-symbols");
  const daysEl = document.querySelector("#manual-operation-days");
  const limitEl = document.querySelector("#manual-operation-limit");
  const confirmEl = document.querySelector("#manual-operation-confirm");

  const secret = String(secretEl?.value || "").trim();
  const symbols = String(symbolsEl?.value || "").trim();
  const days = Number(daysEl?.value || 30);
  const limit = Number(limitEl?.value || 260);
  const confirmed = Boolean(confirmEl?.checked);

  if (!secret) {
    return {
      ok: false,
      message: "Inserisci CRON_SECRET prima di lanciare un job."
    };
  }

  if (!confirmed) {
    return {
      ok: false,
      message: "Seleziona la conferma prima di eseguire job manuali."
    };
  }

  if (!symbols) {
    return {
      ok: false,
      message: "Inserisci almeno un ticker nel campo Symbols."
    };
  }

  return {
    ok: true,
    secret,
    symbols,
    days: Number.isNaN(days) ? 30 : days,
    limit: Number.isNaN(limit) ? 260 : limit
  };
}

function updateManualOperationsStatus(message, status = "neutral") {
  const statusEl = document.querySelector("#manual-operations-status");

  if (!statusEl) {
    return;
  }

  const className =
    status === "success"
      ? "description-box manual-operations-status--success"
      : status === "error"
        ? "audit-box manual-operations-status--error"
        : "description-box";

  statusEl.className = className;
  statusEl.innerHTML = `
    <p>${message}</p>
  `;
}

function renderManualOperationsResult(result) {
  const resultEl = document.querySelector("#manual-operations-result");

  if (!resultEl) {
    return;
  }

  resultEl.innerHTML = `
    <section class="manual-operations-result">
      <div class="manual-operations-result__header">
        <div>
          <p class="eyebrow">Job result</p>
          <h3>Risultato ultimo job</h3>
        </div>

        <span class="quality-badge quality-badge--neutral">
          JSON
        </span>
      </div>

      <pre>${escapeHtml(JSON.stringify(result, null, 2))}</pre>
    </section>
  `;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

window.resetManualOperationsForm = function resetManualOperationsForm() {
  const secretEl = document.querySelector("#manual-operation-secret");
  const symbolsEl = document.querySelector("#manual-operation-symbols");
  const daysEl = document.querySelector("#manual-operation-days");
  const limitEl = document.querySelector("#manual-operation-limit");
  const confirmEl = document.querySelector("#manual-operation-confirm");
  const resultEl = document.querySelector("#manual-operations-result");

  if (secretEl) {
    secretEl.value = "";
  }

  if (symbolsEl) {
    symbolsEl.value = "AAPL,MSFT,JPM,NVDA,AMZN";
  }

  if (daysEl) {
    daysEl.value = "30";
  }

  if (limitEl) {
    limitEl.value = "260";
  }

  if (confirmEl) {
    confirmEl.checked = false;
  }

  if (resultEl) {
    resultEl.innerHTML = "";
  }

  updateManualOperationsStatus(
    "Form ripristinato. CRON_SECRET rimosso dalla vista.",
    "success"
  );
};

function renderManualOperationsLog(logItems) {
  if (!logItems.length) {
    return `
      <section class="note-box">
        Nessun job manuale registrato in questa sessione/browser.
      </section>
    `;
  }

  const rows = logItems
    .map((item) => {
      const badgeClass =
        item.status === "success"
          ? "quality-badge--ok"
          : item.status === "error"
            ? "quality-badge--danger"
            : "quality-badge--neutral";

      return `
        <article class="manual-operation-log-item">
          <div class="manual-operation-log-item__top">
            <div>
              <p class="metric-label">${formatValue(item.jobType)}</p>
              <h3>${formatValue(item.symbols)}</h3>
            </div>

            <span class="quality-badge ${badgeClass}">
              ${formatValue(item.status)}
            </span>
          </div>

          <p>${formatValue(item.message)}</p>

          <div class="manual-operation-log-item__meta">
            <span>Started: ${formatValue(item.startedAt)}</span>
            <span>Finished: ${formatValue(item.finishedAt)}</span>
          </div>
        </article>
      `;
    })
    .join("");

  return `
    <div class="manual-operations-log-list">
      ${rows}
    </div>
  `;
}

function refreshManualOperationsLogView() {
  const logEl = document.querySelector("#manual-operations-log");

  if (!logEl) {
    return;
  }

  logEl.innerHTML = renderManualOperationsLog(getManualOperationsLog());
}

window.clearManualOperationsLogView = function clearManualOperationsLogView() {
  clearManualOperationsLog();
  refreshManualOperationsLogView();
  updateManualOperationsStatus("Execution Log locale pulito.", "success");
};
