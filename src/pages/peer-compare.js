import { mockPeerComparisons } from "../data/mock-peer-comparisons.js";

function renderPeerComparisonRow(item) {
  const sampleBadge =
    item.sampleSize < 8
      ? `<span class="quality-badge quality-badge--warning">Campione ridotto</span>`
      : `<span class="quality-badge quality-badge--ok">Campione n=${item.sampleSize}</span>`;

  return `
    <article class="comparison-card">
      <div class="comparison-card__header">
        <div>
          <p class="eyebrow">${item.ticker}</p>
          <h3>${item.companyName}</h3>
        </div>
        ${sampleBadge}
      </div>

      <div class="comparison-grid">
        <div>
          <p class="metric-label">Peer group</p>
          <strong>${item.peerGroup}</strong>
        </div>

        <div>
          <p class="metric-label">Metrica</p>
          <strong>${item.metricName}</strong>
        </div>

        <div>
          <p class="metric-label">Valore titolo</p>
          <strong>${item.metricValue}</strong>
        </div>

        <div>
          <p class="metric-label">Mediana peer</p>
          <strong>${item.peerMedian}</strong>
        </div>
      </div>

      <section class="description-box">
        <p>
          Nel periodo ${item.period}, la metrica ${item.metricName} di ${item.ticker}
          risulta pari a ${item.metricValue}, rispetto a una mediana del peer group
          pari a ${item.peerMedian}. Lo scostamento descrittivo è ${item.deviation}.
        </p>
      </section>

      <section class="audit-box">
        <p><strong>Fonte:</strong> ${item.source}</p>
        <p><strong>Completezza:</strong> ${item.completeness}</p>
        <p><strong>Limite:</strong> ${item.limitation}</p>
      </section>
    </article>
  `;
}

export function renderPeerComparePage() {
  const rows = mockPeerComparisons.map(renderPeerComparisonRow).join("");

  return `
    <header class="app-header">
      <div>
        <p class="eyebrow">Comparables</p>
        <h1>Peer Compare</h1>
        <p class="subtitle">
          Confronto descrittivo tra singolo titolo e peer group. I dati sono mock
          e servono solo per costruire la struttura dell'esperienza utente.
        </p>
      </div>
    </header>

    <section class="panel">
      <div class="panel-header">
        <div>
          <h2>Confronti fondamentali</h2>
          <p>
            Ogni metrica mostra valore, mediana peer, completezza, fonte e limiti.
          </p>
        </div>
      </div>

      <div class="stack">
        ${rows}
      </div>
    </section>
  `;
}