import { getRealDataStatus } from "../state/real-data-status.js";
import { fetchDataQualityOverview } from "../services/data-quality-api.js";

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
