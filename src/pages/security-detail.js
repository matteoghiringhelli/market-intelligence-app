export function renderSecurityDetail(security) {
  if (!security) {
    return `
      <section class="panel">
        <h2>Titolo non trovato</h2>
        <p>La scheda richiesta non è disponibile.</p>
      </section>
    `;
  }

  return `
    <section class="panel">
      <div class="panel-header">
        <div>
          <h2>${security.ticker} — ${security.companyName}</h2>
          <p>
            Scheda descrittiva del titolo. I dati sono mock e hanno solo finalità didattica.
          </p>
        </div>
      </div>

      <div class="metric-grid">
        <article class="metric-card">
          <p class="metric-label">Exchange</p>
          <h3>${security.exchange}</h3>
        </article>

        <article class="metric-card">
          <p class="metric-label">Settore</p>
          <h3>${security.sector}</h3>
        </article>

        <article class="metric-card">
          <p class="metric-label">Industria</p>
          <h3>${security.industry}</h3>
        </article>

        <article class="metric-card">
          <p class="metric-label">Qualità dati</p>
          <h3>${security.dataQuality}</h3>
        </article>
      </div>

      <section class="detail-section">
        <h3>Fondamentali descrittivi</h3>
        <p><strong>Gross Margin:</strong> ${security.grossMargin}</p>
        <p>${security.peerComparison}</p>
      </section>

      <section class="detail-section">
        <h3>Audit del dato</h3>
        <p><strong>Fonte:</strong> ${security.source}</p>
        <p><strong>Ultimo aggiornamento:</strong> ${security.lastUpdate}</p>
        <p>
          Ogni valore mostrato nell'app dovrà essere collegato a fonte,
          data di recupero, data di riferimento e completezza.
        </p>
      </section>

      <section class="note-box">
        <strong>Nota metodologica:</strong>
        il testo usa solo linguaggio descrittivo. Non contiene raccomandazioni operative.
      </section>
    </section>
  `;
}