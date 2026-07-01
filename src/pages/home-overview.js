const overviewCards = [
  {
    title: "Market Dashboard",
    eyebrow: "Securities",
    description:
      "Consulta una lista mock di titoli azionari con settore, industria, fonte, qualità dati e scheda descrittiva.",
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
      "Controlla freschezza, completezza, fonte, data di riferimento e problemi noti dei dataset mock.",
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

export function renderHomeOverviewPage() {
  const cards = overviewCards.map(renderOverviewCard).join("");

  return `
    <header class="app-header">
      <div>
        <p class="eyebrow">Educational Market Intelligence</p>
        <h1>Home Overview</h1>
        <p class="subtitle">
          Vista iniziale della Market Intelligence App. Le quattro aree sotto
          riassumono lo stato del frontend mock prima di collegare fonti dati reali.
        </p>
      </div>
    </header>

    <section class="home-hero panel">
      <div>
        <p class="eyebrow">MVP 0.4 Cloud-only</p>
        <h2>Frontend mock completo</h2>
        <p>
          Questa versione usa solo GitHub, Codespaces e Vercel. I dati sono mock
          e servono per validare architettura informativa, navigazione, copy,
          disclaimer e componenti principali.
        </p>
      </div>

      <div class="home-hero__status">
        <span class="quality-badge quality-badge--ok">Online-ready</span>
        <span class="quality-badge quality-badge--neutral">Mock data</span>
        <span class="quality-badge quality-badge--warning">No real data yet</span>
      </div>
    </section>

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