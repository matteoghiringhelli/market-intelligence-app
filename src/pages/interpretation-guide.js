import {
  interpretationGuideSections,
  interpretationExamples
} from "../data/interpretation-guide.js";

function renderList(items) {
  return items
    .map((item) => {
      return `<li>${item}</li>`;
    })
    .join("");
}

function renderGuideSection(section) {
  return `
    <article class="interpretation-section-card" id="guide-${section.id}">
      <div class="interpretation-section-card__header">
        <div>
          <p class="eyebrow">${section.eyebrow}</p>
          <h3>${section.title}</h3>
        </div>

        <span class="quality-badge quality-badge--neutral">
          Teoria
        </span>
      </div>

      <section class="description-box">
        <p>${section.description}</p>
      </section>

      <section class="interpretation-theory-box">
        <p class="metric-label">Interpretazione teorica</p>
        <p>${section.theoreticalInterpretation}</p>
      </section>

      <div class="interpretation-two-column">
        <section>
          <h4>Come leggerlo</h4>
          <ul class="interpretation-list">
            ${renderList(section.howToRead)}
          </ul>
        </section>

        <section>
          <h4>Cosa non concludere automaticamente</h4>
          <ul class="interpretation-list interpretation-list--warning">
            ${renderList(section.notToConclude)}
          </ul>
        </section>
      </div>

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
          e qualità del dato secondo i framework normalmente usati nell'analisi
          finanziaria, senza trasformare la lettura in raccomandazione operativa.
        </p>
      </div>
    </header>

    <section class="panel">
      <div class="panel-header">
        <div>
          <h2>Come interpretare i dati</h2>
          <p>
            Questa pagina spiega non solo cosa misura un indicatore, ma anche
            come viene normalmente interpretato nella teoria finanziaria e quali
            conclusioni non bisogna trarre automaticamente.
          </p>
        </div>
      </div>

      <section class="note-box">
        <strong>Regola fondamentale:</strong>
        questa guida offre interpretazioni teoriche ed educative. Non fornisce
        consulenza finanziaria, segnali operativi, raccomandazioni buy/sell o
        indicazioni personalizzate.
      </section>

      <div class="interpretation-grid">
        ${sections}
      </div>

      <section class="detail-section">
        <h3>Esempi di linguaggio corretto</h3>
        <p class="muted-text">
          L'app può spiegare come la teoria interpreta un indicatore, ma deve
          evitare formulazioni imperative, predittive o persuasive.
        </p>

        <div class="stack">
          ${examples}
        </div>
      </section>
    </section>
  `;
}