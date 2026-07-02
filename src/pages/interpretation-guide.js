import {
  interpretationGuideSections,
  interpretationExamples
} from "../data/interpretation-guide.js";

function renderGuideSection(section) {
  const bullets = section.bullets
    .map((bullet) => {
      return `<li>${bullet}</li>`;
    })
    .join("");

  return `
    <article class="interpretation-section-card" id="guide-${section.id}">
      <div class="interpretation-section-card__header">
        <div>
          <p class="eyebrow">${section.eyebrow}</p>
          <h3>${section.title}</h3>
        </div>

        <span class="quality-badge quality-badge--neutral">
          Educational
        </span>
      </div>

      <section class="description-box">
        <p>${section.description}</p>
      </section>

      <ul class="interpretation-list">
        ${bullets}
      </ul>

      <section class="audit-box">
        <p><strong>Limite di interpretazione:</strong> ${section.limitation}</p>
      </section>
    </article>
  `;
}

function renderExample(example) {
  return `
    <article class="interpretation-example-card">
      <h3>${example.title}</h3>

      <div class="interpretation-example-grid">
        <section class="interpretation-example-box interpretation-example-box--bad">
          <p class="metric-label">Formula da evitare</p>
          <p>${example.bad}</p>
        </section>

        <section class="interpretation-example-box interpretation-example-box--good">
          <p class="metric-label">Formula corretta</p>
          <p>${example.good}</p>
        </section>
      </div>
    </article>
  `;
}

export function renderInterpretationGuidePage() {
  const sections = interpretationGuideSections.map(renderGuideSection).join("");
  const examples = interpretationExamples.map(renderExample).join("");

  return `
    <header class="app-header">
      <div>
        <p class="eyebrow">Education Layer</p>
        <h1>Interpretation Guide</h1>
        <p class="subtitle">
          Guida teorica per leggere pattern tecnici, fondamentali, peer comparison
          e qualità del dato in modo descrittivo e non consulenziale.
        </p>
      </div>
    </header>

    <section class="panel">
      <div class="panel-header">
        <div>
          <h2>Come interpretare i dati</h2>
          <p>
            Questa pagina spiega il significato dei principali blocchi analitici
            dell'app e chiarisce i limiti di interpretazione.
          </p>
        </div>
      </div>

      <section class="note-box">
        <strong>Regola fondamentale:</strong>
        la guida non fornisce consulenza finanziaria, segnali operativi,
        raccomandazioni buy/sell o indicazioni personalizzate. Serve solo a
        leggere correttamente dati descrittivi.
      </section>

      <div class="interpretation-grid">
        ${sections}
      </div>

      <section class="detail-section">
        <h3>Esempi di linguaggio corretto</h3>
        <p class="muted-text">
          L'app deve privilegiare formulazioni descrittive, evitando termini
          predittivi, imperativi o persuasivi.
        </p>

        <div class="stack">
          ${examples}
        </div>
      </section>
    </section>
  `;
}