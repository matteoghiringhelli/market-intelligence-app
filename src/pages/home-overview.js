import { getRealDataStatus } from "../state/real-data-status.js";

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

export function renderHomeOverviewPage() {
  const cards = overviewCards.map(renderOverviewCard).join("");

  return `
    <header class="app-header">
      <div>
        <p class="eyebrow">Educational Market Intelligence</p>
        <h1>Home Overview</h1>
        <p class="subtitle">
          Vista iniziale della Market Intelligence App. Le quattro aree sotto
          riassumono lo stato del frontend e il nuovo layer dati reali.
        </p>
      </div>
    </header>

    <section class="home-hero panel">
      <div>
        <p class="eyebrow">Cloud-only MVP</p>
        <h2>Frontend mock + real data layer</h2>
        <p>
          Questa versione usa GitHub, Codespaces e Vercel. I dati mock restano
          disponibili come fallback, mentre le quote reali vengono caricate on-demand
          dalla Dashboard tramite route multi-provider.
        </p>
      </div>

      <div class="home-hero__status">
        <span class="quality-badge quality-badge--ok">Vercel API</span>
        <span class="quality-badge quality-badge--neutral">Multi-provider</span>
        <span class="quality-badge quality-badge--warning">On-demand only</span>
      </div>
    </section>

    ${renderRealDataStatusIndicator()}

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