import { mockSecurities } from "../data/mock-securities.js";

function renderSecurityCard(security) {
  return `
    <article class="security-card">
      <div class="security-card__top">
        <div>
          <h2>${security.ticker}</h2>
          <p>${security.companyName}</p>
        </div>
        <span class="badge">${security.exchange}</span>
      </div>

      <div class="security-card__body">
        <p><strong>Settore:</strong> ${security.sector}</p>
        <p><strong>Industria:</strong> ${security.industry}</p>
        <p><strong>Qualità dati:</strong> ${security.dataQuality}</p>
        <p><strong>Ultimo aggiornamento:</strong> ${security.lastUpdate}</p>
        <p><strong>Fonte:</strong> ${security.source}</p>
      </div>

      <button class="button" type="button" onclick="openSecurityDetail('${security.ticker}')">
        Apri scheda titolo
      </button>
    </article>
  `;
}

export function renderDashboard() {
  const cards = mockSecurities.map(renderSecurityCard).join("");

  return `
    <header class="app-header">
      <div>
        <p class="eyebrow">Educational Market Intelligence</p>
        <h1>Market Intelligence App</h1>
        <p class="subtitle">
          Dashboard didattica per consultare dati descrittivi su titoli azionari,
          peer group, pattern tecnici e qualità dati.
        </p>
      </div>
    </header>

    <section class="panel">
      <div class="panel-header">
        <div>
          <h2>Dashboard titoli</h2>
          <p>
            Prima versione cloud-only con dati mock salvati nel repository GitHub.
          </p>
        </div>
      </div>

      <div class="grid">
        ${cards}
      </div>
    </section>
  `;
}