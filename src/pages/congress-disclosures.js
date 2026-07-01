import { mockCongressDisclosures } from "../data/mock-congress-disclosures.js";

function getMappingBadgeClass(disclosure) {
  if (disclosure.ticker === "UNRESOLVED") {
    return "quality-badge--warning";
  }

  return "quality-badge--ok";
}

function getDelayBadgeClass(disclosure) {
  if (disclosure.reportingDelayDays >= 40) {
    return "quality-badge--warning";
  }

  return "quality-badge--neutral";
}

function renderDisclosureCard(disclosure) {
  const mappingBadgeClass = getMappingBadgeClass(disclosure);
  const delayBadgeClass = getDelayBadgeClass(disclosure);

  return `
    <article class="disclosure-card">
      <div class="disclosure-card__header">
        <div>
          <p class="eyebrow">${disclosure.disclosureId}</p>
          <h3>${disclosure.assetDescription}</h3>
          <p class="muted-text">
            Dichiarante: ${disclosure.memberName} · Camera: ${disclosure.chamber}
          </p>
        </div>

        <span class="quality-badge ${mappingBadgeClass}">
          ${disclosure.ticker}
        </span>
      </div>

      <div class="disclosure-grid">
        <div>
          <p class="metric-label">Tipo operazione</p>
          <strong>${disclosure.transactionType}</strong>
        </div>

        <div>
          <p class="metric-label">Intervallo dichiarato</p>
          <strong>${disclosure.amountRange}</strong>
        </div>

        <div>
          <p class="metric-label">Data operazione</p>
          <strong>${disclosure.transactionDate}</strong>
        </div>

        <div>
          <p class="metric-label">Data disclosure</p>
          <strong>${disclosure.disclosureDate}</strong>
        </div>
      </div>

      <section class="description-box">
        <p>
          Disclosure pubblica relativa a ${disclosure.assetDescription}.
          La dichiarazione è stata pubblicata il ${disclosure.disclosureDate}
          e fa riferimento a una transazione datata ${disclosure.transactionDate}.
        </p>
      </section>

      <section class="disclosure-meta-row">
        <span class="quality-badge ${delayBadgeClass}">
          Ritardo dichiarazione: ${disclosure.reportingDelayDays} giorni
        </span>

        <span class="quality-badge ${mappingBadgeClass}">
          ${disclosure.mappingStatus}
        </span>
      </section>

      <section class="audit-box">
        <p><strong>Fonte:</strong> ${disclosure.source}</p>
        <p><strong>Raw reference URL:</strong> ${disclosure.rawReferenceUrl}</p>
        <p><strong>Limiti:</strong> ${disclosure.limitations}</p>
      </section>
    </article>
  `;
}

export function renderCongressDisclosuresPage() {
  const cards = mockCongressDisclosures.map(renderDisclosureCard).join("");

  return `
    <header class="app-header">
      <div>
        <p class="eyebrow">Public Disclosures</p>
        <h1>Congress Disclosures</h1>
        <p class="subtitle">
          Sezione mock per visualizzare disclosure pubbliche, date di transazione,
          date di pubblicazione, intervalli dichiarati, ritardo di reporting e stato
          di normalizzazione dell'asset.
        </p>
      </div>
    </header>

    <section class="panel">
      <div class="panel-header">
        <div>
          <h2>Disclosure pubbliche mock</h2>
          <p>
            Questa pagina non interpreta le intenzioni dei dichiaranti e non suggerisce
            alcuna azione. Mostra solo dati descrittivi, limiti e qualità della normalizzazione.
          </p>
        </div>
      </div>

      <section class="note-box">
        <strong>Disclaimer specifico disclosure:</strong>
        le disclosure pubbliche possono usare intervalli di valore ampi, essere pubblicate
        con ritardo e contenere descrizioni asset non immediatamente associabili a un ticker.
        Questa sezione ha finalità esclusivamente informativa ed educativa.
      </section>

      <div class="stack disclosure-stack">
        ${cards}
      </div>
    </section>
  `;
}