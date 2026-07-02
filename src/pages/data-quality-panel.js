import { mockDataQualitySources } from "../data/mock-data-quality.js";
import { fetchDataQualityOverview } from "../services/data-quality-api.js";

function getQualityBadgeClass(source) {
  if (source.completeness === "0%") {
    return "quality-badge--danger";
  }

  if (source.freshness === "Parziale") {
    return "quality-badge--warning";
  }

  if (source.freshness === "Non ancora implementato") {
    return "quality-badge--danger";
  }

  return "quality-badge--ok";
}

function renderSourceQualityCard(source) {
  const badgeClass = getQualityBadgeClass(source);

  return `
    <article class="quality-card">
      <div class="quality-card__header">
        <div>
          <p class="eyebrow">${source.sourceId}</p>
          <h3>${source.datasetName}</h3>
        </div>
        <span class="quality-badge ${badgeClass}">
          ${source.freshness}
        </span>
      </div>

      <div class="quality-grid">
        <div>
          <p class="metric-label">Completezza</p>
          <strong>${source.completeness}</strong>
        </div>

        <div>
          <p class="metric-label">Reliability tier</p>
          <strong>${source.reliabilityTier}</strong>
        </div>

        <div>
          <p class="metric-label">Fetched at</p>
          <strong>${source.lastFetchedAt}</strong>
        </div>

        <div>
          <p class="metric-label">Data as of</p>
          <strong>${source.dataAsOf}</strong>
        </div>
      </div>

      <section class="audit-box">
        <p><strong>Note / issue note:</strong> ${source.knownIssues}</p>
      </section>
    </article>
  `;
}

export function renderDataQualityPanelPage() {
  setTimeout(loadRealDataQualityOverview, 0);

  const mockCards = mockDataQualitySources.map(renderSourceQualityCard).join("");

  return `
    <header class="app-header">
      <div>
        <p class="eyebrow">Data Governance</p>
        <h1>Data Quality Panel</h1>
        <p class="subtitle">
          Pannello per monitorare freschezza, completezza, fonte,
          data di riferimento, ingestion run e problemi noti.
        </p>
      </div>
    </header>

    <section class="panel">
      <div class="panel-header">
        <div>
          <h2>Data Quality reale da Supabase</h2>
          <p>
            Lettura da viste e tabelle Supabase: storico prezzi, ingestion runs,
            data quality log e pattern tecnici.
          </p>
        </div>
      </div>

      <div id="real-data-quality-status" class="description-box">
        Caricamento Data Quality reale da Supabase...
      </div>

      <div id="real-data-quality-content"></div>

      <section class="detail-section">
        <h3>Fallback mock educativo</h3>
        <p class="muted-text">
          Le card mock restano disponibili come riferimento UX e come fallback se Supabase
          non è ancora popolato.
        </p>

        <div class="stack">
          ${mockCards}
        </div>
      </section>
    </section>
  `;
}

async function loadRealDataQualityOverview() {
  const statusEl = document.querySelector("#real-data-quality-status");
  const contentEl = document.querySelector("#real-data-quality-content");

  if (!statusEl || !contentEl) {
    return;
  }

  try {
    const payload = await fetchDataQualityOverview();
    const data = payload.data;

    statusEl.innerHTML = `
      <p>
        Data Quality reale recuperata da Supabase.
        Generated at: <strong>${formatValue(data.generated_at)}</strong>.
      </p>
    `;

    contentEl.innerHTML = `
      ${renderPriceHistoryQuality(data.price_history_summary)}
      ${renderTechnicalPatternsQuality(data.technical_patterns_summary)}
      ${renderIngestionRuns(data.latest_ingestion_runs)}
      ${renderQualityLogs(data.latest_quality_logs)}
    `;
  } catch (error) {
    statusEl.innerHTML = `
      <p><strong>Errore recupero Data Quality reale:</strong> ${error.message}</p>
      <p>
        Il pannello resta disponibile con fallback mock. Verifica Supabase, variabili ambiente,
        tabelle e singolo router Vercel.
      </p>
    `;

    contentEl.innerHTML = "";
  }
}

function renderPriceHistoryQuality(result) {
  if (!result?.ok) {
    return renderQualityErrorSection(
      "Storico prezzi",
      result?.error || "Dati non disponibili"
    );
  }

  const rows = result.rows || [];

  if (!rows.length) {
    return `
      <section class="detail-section">
        <h3>Storico prezzi Supabase</h3>
        <section class="note-box">
          Nessun record trovato in <code>serving_price_history_summary</code>.
          Esegui prima <code>/api/jobs/daily-history-update</code>.
        </section>
      </section>
    `;
  }

  const cards = rows
    .map((row) => {
      const completenessClass =
        Number(row.average_completeness_score || 0) >= 80
          ? "quality-badge--ok"
          : "quality-badge--warning";

      return `
        <article class="quality-card">
          <div class="quality-card__header">
            <div>
              <p class="eyebrow">${formatValue(row.source_id)}</p>
              <h3>${row.ticker}</h3>
            </div>

            <span class="quality-badge ${completenessClass}">
              ${formatValue(row.average_completeness_score)}%
            </span>
          </div>

          <div class="quality-grid">
            <div>
              <p class="metric-label">Prima data</p>
              <strong>${formatValue(row.first_date)}</strong>
            </div>

            <div>
              <p class="metric-label">Ultima data</p>
              <strong>${formatValue(row.latest_date)}</strong>
            </div>

            <div>
              <p class="metric-label">Record</p>
              <strong>${formatValue(row.records_count)}</strong>
            </div>

            <div>
              <p class="metric-label">Latest fetched</p>
              <strong>${formatValue(row.latest_fetched_at)}</strong>
            </div>
          </div>
        </article>
      `;
    })
    .join("");

  return `
    <section class="detail-section">
      <h3>Storico prezzi Supabase</h3>
      <div class="stack">
        ${cards}
      </div>
    </section>
  `;
}

function renderTechnicalPatternsQuality(result) {
  if (!result?.ok) {
    return renderQualityErrorSection(
      "Pattern tecnici",
      result?.error || "Dati non disponibili"
    );
  }

  const rows = result.summary_by_ticker || [];

  if (!rows.length) {
    return `
      <section class="detail-section">
        <h3>Pattern tecnici Supabase</h3>
        <section class="note-box">
          Nessun pattern tecnico trovato. Esegui prima
          <code>/api/jobs/detect-technical-patterns</code>.
        </section>
      </section>
    `;
  }

  const cards = rows
    .map((row) => {
      return `
        <article class="quality-card">
          <div class="quality-card__header">
            <div>
              <p class="eyebrow">${formatValue(row.source_id)}</p>
              <h3>${row.ticker}</h3>
            </div>

            <span class="quality-badge quality-badge--neutral">
              ${formatValue(row.patterns_count)} pattern
            </span>
          </div>

          <div class="quality-grid">
            <div>
              <p class="metric-label">Ultimo calcolo</p>
              <strong>${formatValue(row.latest_computed_at)}</strong>
            </div>

            <div>
              <p class="metric-label">Finestra dati</p>
              <strong>${formatValue(row.latest_window_end)}</strong>
            </div>

            <div>
              <p class="metric-label">Fonte</p>
              <strong>${formatValue(row.source_id)}</strong>
            </div>

            <div>
              <p class="metric-label">Tipo</p>
              <strong>Descrittivo</strong>
            </div>
          </div>
        </article>
      `;
    })
    .join("");

  return `
    <section class="detail-section">
      <h3>Pattern tecnici Supabase</h3>
      <div class="stack">
        ${cards}
      </div>
    </section>
  `;
}

function renderIngestionRuns(result) {
  if (!result?.ok) {
    return renderQualityErrorSection(
      "Ingestion runs",
      result?.error || "Dati non disponibili"
    );
  }

  const rows = result.rows || [];

  const tableRows = rows
    .map((row) => {
      return `
        <tr>
          <td>${formatValue(row.job_name)}</td>
          <td>${formatValue(row.provider)}</td>
          <td>${formatValue(row.status)}</td>
          <td>${formatValue(row.started_at)}</td>
          <td>${formatValue(row.finished_at)}</td>
          <td>${formatValue(row.successful_symbols)}</td>
          <td>${formatValue(row.failed_symbols)}</td>
        </tr>
      `;
    })
    .join("");

  return `
    <section class="detail-section">
      <h3>Ultimi ingestion runs</h3>

      <div class="history-table-wrapper">
        <table class="history-table">
          <thead>
            <tr>
              <th>Job</th>
              <th>Provider</th>
              <th>Status</th>
              <th>Started</th>
              <th>Finished</th>
              <th>OK</th>
              <th>Failed</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function renderQualityLogs(result) {
  if (!result?.ok) {
    return renderQualityErrorSection(
      "Data quality log",
      result?.error || "Dati non disponibili"
    );
  }

  const rows = result.rows || [];

  const tableRows = rows
    .map((row) => {
      return `
        <tr>
          <td>${formatValue(row.table_name)}</td>
          <td>${formatValue(row.record_ref)}</td>
          <td>${formatValue(row.field_name)}</td>
          <td>${formatValue(row.source_id)}</td>
          <td>${formatValue(row.completeness_flag)}</td>
          <td>${formatValue(row.created_at)}</td>
        </tr>
      `;
    })
    .join("");

  return `
    <section class="detail-section">
      <h3>Data quality log</h3>

      <div class="history-table-wrapper">
        <table class="history-table">
          <thead>
            <tr>
              <th>Table</th>
              <th>Record</th>
              <th>Field</th>
              <th>Source</th>
              <th>Complete</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function renderQualityErrorSection(title, error) {
  return `
    <section class="detail-section">
      <h3>${title}</h3>
      <section class="audit-box">
        <p><strong>Errore:</strong> ${error}</p>
      </section>
    </section>
  `;
}

function formatValue(value) {
  if (value === null || value === undefined || value === "") {
    return "n/d";
  }

  return value;
}