import { mockTechnicalPatterns } from "../data/mock-technical-patterns.js";

function renderPatternCard(pattern) {
  return `
    <article class="pattern-card">
      <div class="pattern-card__header">
        <div>
          <p class="eyebrow">${pattern.ticker}</p>
          <h3>${pattern.patternName}</h3>
        </div>
        <span class="quality-badge quality-badge--neutral">${pattern.timeframe}</span>
      </div>

      <section class="description-box">
        <p>${pattern.explanation}</p>
      </section>

      <div class="technical-grid">
        <div>
          <p class="metric-label">Condizione osservata</p>
          <strong>${pattern.triggerConditions}</strong>
        </div>

        <div>
          <p class="metric-label">Data rilevazione</p>
          <strong>${pattern.detectedAt}</strong>
        </div>

        <div>
          <p class="metric-label">Fonte</p>
          <strong>${pattern.source}</strong>
        </div>
      </div>

      <section class="audit-box">
        <p><strong>Limiti:</strong> ${pattern.limitations}</p>
      </section>
    </article>
  `;
}

export function renderTechnicalPatternsPage() {
  const cards = mockTechnicalPatterns.map(renderPatternCard).join("");

  return `
    <header class="app-header">
      <div>
        <p class="eyebrow">Technical Descriptive Layer</p>
        <h1>Technical Patterns</h1>
        <p class="subtitle">
          Pattern tecnici descrittivi con spiegazione, condizioni osservate,
          timeframe e limiti. Nessun segnale operativo viene generato.
        </p>
      </div>
    </header>

    <section class="panel">
      <div class="panel-header">
        <div>
          <h2>Pattern rilevati</h2>
          <p>
            Questa versione usa dati mock. In futuro i pattern saranno calcolati
            da serie storiche normalizzate.
          </p>
        </div>
      </div>

      <div class="stack">
        ${cards}
      </div>
    </section>
  `;
}