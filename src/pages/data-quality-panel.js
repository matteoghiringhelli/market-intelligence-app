import { mockDataQualitySources } from "../data/mock-data-quality.js";

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
  const cards = mockDataQualitySources.map(renderSourceQualityCard).join("");

  return `
    <header class="app-header">
      <div>
        <p class="eyebrow">Data Governance</p>
        <h1>Data Quality Panel</h1>
        <p class="subtitle">
          Pannello mock per monitorare freschezza, completezza, fonte,
          data di riferimento e problemi noti dei dataset.
        </p>
      </div>
    </header>

    <section class="panel">
      <div class="panel-header">
        <div>
          <h2>Stato fonti e dataset</h2>
          <p>
            L'obiettivo è rendere visibile la qualità del dato prima di mostrare
            analisi più avanzate.
          </p>
        </div>
      </div>

      <div class="stack">
        ${cards}
      </div>
    </section>
  `;
}