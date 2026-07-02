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
  } catch (error) {
    statusEl.innerHTML = `
      <p><strong>Errore caricamento Market Snapshot:</strong> ${error.message}</p>
      <p>
        La Home resta disponibile. Verifica <code>/api/market/data-quality-db</code>,
        Supabase e il singolo router Vercel.
      </p>
    `;

    contentEl.innerHTML = renderEmptyMarketSnapshot();
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