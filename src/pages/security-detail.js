import { fetchHistoricalPricesFromDb } from "../services/historical-market-api.js";
import { fetchTechnicalPatternsFromDb } from "../services/technical-patterns-api.js";

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
            Scheda descrittiva del titolo. I dati mock restano disponibili,
            mentre storico e pattern tecnici possono essere letti dal data layer Supabase.
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
          <p class="metric-label">Qualità dati mock</p>
          <h3>${security.dataQuality}</h3>
        </article>
      </div>

      <section class="detail-section">
        <h3>Fondamentali descrittivi mock</h3>
        <p><strong>Gross Margin:</strong> ${security.grossMargin || "n/d"}</p>
        <p>${security.peerComparison || "Confronto peer non disponibile per questo titolo."}</p>
      </section>

      <section class="detail-section historical-section">
        <div class="historical-section__header">
          <div>
            <h3>Storico giornaliero da Supabase</h3>
            <p>
              Lettura persistente da <code>price_history</code> tramite API
              <code>/api/market/history-db</code>.
            </p>
          </div>

          <button
            class="button historical-load-button"
            type="button"
            onclick="loadSecurityHistory('${security.ticker}')"
          >
            Carica storico Supabase
          </button>
        </div>

        <div id="security-history-status" class="description-box">
          Storico non ancora caricato per ${security.ticker}.
        </div>

        <div id="security-history-summary"></div>

        <div id="security-history-table"></div>
      </section>

      <section class="detail-section technical-patterns-detail-section">
        <div class="historical-section__header">
          <div>
            <h3>Pattern tecnici reali da Supabase</h3>
            <p>
              Lettura dei pattern calcolati dal job
              <code>/api/jobs/detect-technical-patterns</code>
              e salvati nella tabella <code>technical_patterns</code>.
            </p>
          </div>

          <button
            class="button historical-load-button"
            type="button"
            onclick="loadSecurityTechnicalPatterns('${security.ticker}')"
          >
            Carica pattern tecnici
          </button>
        </div>

        <div id="security-patterns-status" class="description-box">
          Pattern tecnici non ancora caricati per ${security.ticker}.
        </div>

        <div id="security-patterns-stack" class="stack"></div>
      </section>

      <section class="detail-section">
        <h3>Audit del dato</h3>
        <p><strong>Fonte mock:</strong> ${security.source}</p>
        <p><strong>Ultimo aggiornamento mock:</strong> ${security.lastUpdate}</p>
        <p>
          Ogni dato storico e ogni pattern tecnico salvato in Supabase deve mantenere
          fonte, timestamp, data di riferimento e note sui limiti.
        </p>
      </section>

      <section class="note-box">
        <strong>Nota metodologica:</strong>
        il testo usa solo linguaggio descrittivo. Non contiene raccomandazioni operative,
        segnali di trading o indicazioni personalizzate.
      </section>
    </section>
  `;
}

window.loadSecurityHistory = async function loadSecurityHistory(symbol) {
  const statusEl = document.querySelector("#security-history-status");
  const summaryEl = document.querySelector("#security-history-summary");
  const tableEl = document.querySelector("#security-history-table");

  if (!statusEl || !summaryEl || !tableEl) {
    return;
  }

  statusEl.innerHTML = `
    <p>Caricamento storico giornaliero per <strong>${symbol}</strong> da Supabase...</p>
  `;

  summaryEl.innerHTML = "";
  tableEl.innerHTML = "";

  try {
    const payload = await fetchHistoricalPricesFromDb(symbol, 60);
    const records = payload?.data?.records || [];

    if (!records.length) {
      statusEl.innerHTML = `
        <p>
          Nessun dato storico trovato in Supabase per <strong>${symbol}</strong>.
        </p>
        <p>
          Esegui prima il job:
          <code>/api/jobs/daily-history-update?symbols=${symbol}&days=30&secret=...</code>
        </p>
      `;
      return;
    }

    statusEl.innerHTML = `
      <p>
        Storico recuperato correttamente da Supabase.
        Record disponibili: <strong>${records.length}</strong>.
      </p>
    `;

    summaryEl.innerHTML = renderHistorySummary(payload, records);
    tableEl.innerHTML = renderHistoryTable(records);
  } catch (error) {
    statusEl.innerHTML = `
      <p><strong>Errore recupero storico:</strong> ${error.message}</p>
      <p>
        La scheda resta disponibile con dati mock. Verifica che Supabase sia configurato
        e che il job giornaliero abbia popolato <code>price_history</code>.
      </p>
    `;
  }
};

window.loadSecurityTechnicalPatterns = async function loadSecurityTechnicalPatterns(symbol) {
  const statusEl = document.querySelector("#security-patterns-status");
  const stackEl = document.querySelector("#security-patterns-stack");

  if (!statusEl || !stackEl) {
    return;
  }

  statusEl.innerHTML = `
    <p>Caricamento pattern tecnici per <strong>${symbol}</strong> da Supabase...</p>
  `;

  stackEl.innerHTML = "";

  try {
    const payload = await fetchTechnicalPatternsFromDb(symbol, 20);
    const patterns = payload?.data?.patterns || [];

    if (!patterns.length) {
      statusEl.innerHTML = `
        <p>
          Nessun pattern tecnico reale trovato per <strong>${symbol}</strong>.
        </p>
        <p>
          Esegui prima:
          <code>/api/jobs/detect-technical-patterns?symbols=${symbol}&limit=260&secret=...</code>
        </p>
      `;
      return;
    }

    statusEl.innerHTML = `
      <p>
        Pattern tecnici recuperati correttamente da Supabase.
        Pattern disponibili: <strong>${patterns.length}</strong>.
      </p>
    `;

    stackEl.innerHTML = patterns.map(renderSecurityPatternCard).join("");
  } catch (error) {
    statusEl.innerHTML = `
      <p><strong>Errore recupero pattern tecnici:</strong> ${error.message}</p>
      <p>
        La scheda resta disponibile con dati mock. Verifica che il job tecnico abbia popolato
        la tabella <code>technical_patterns</code>.
      </p>
    `;
  }
};

function renderHistorySummary(payload, records) {
  const latestRecord = records[0];
  const oldestRecord = records[records.length - 1];

  const closes = records
    .map((record) => Number(record.close))
    .filter((value) => !Number.isNaN(value));

  const volumes = records
    .map((record) => Number(record.volume))
    .filter((value) => !Number.isNaN(value));

  const highestClose = closes.length ? Math.max(...closes) : null;
  const lowestClose = closes.length ? Math.min(...closes) : null;
  const averageVolume = volumes.length
    ? Math.round(volumes.reduce((sum, value) => sum + value, 0) / volumes.length)
    : null;

  const quality = payload?.data_quality || {};

  return `
    <section class="history-summary-grid">
      <article class="metric-card">
        <p class="metric-label">Periodo coperto</p>
        <h3>${formatValue(oldestRecord?.date)} → ${formatValue(latestRecord?.date)}</h3>
      </article>

      <article class="metric-card">
        <p class="metric-label">Ultima chiusura</p>
        <h3>${formatNumber(latestRecord?.close)}</h3>
      </article>

      <article class="metric-card">
        <p class="metric-label">Range chiusure</p>
        <h3>${formatNumber(lowestClose)} / ${formatNumber(highestClose)}</h3>
      </article>

      <article class="metric-card">
        <p class="metric-label">Volume medio</p>
        <h3>${formatNumber(averageVolume)}</h3>
      </article>

      <article class="metric-card">
        <p class="metric-label">Fonte</p>
        <h3>${formatValue(quality.source_id)}</h3>
      </article>

      <article class="metric-card">
        <p class="metric-label">Data as of</p>
        <h3>${formatValue(quality.data_as_of)}</h3>
      </article>

      <article class="metric-card">
        <p class="metric-label">Completezza media</p>
        <h3>${formatValue(quality.average_completeness_score)}%</h3>
      </article>

      <article class="metric-card">
        <p class="metric-label">Fetched at</p>
        <h3>${formatValue(quality.fetched_at)}</h3>
      </article>
    </section>
  `;
}

function renderHistoryTable(records) {
  const rows = records
    .slice(0, 20)
    .map((record) => {
      return `
        <tr>
          <td>${formatValue(record.date)}</td>
          <td>${formatNumber(record.open)}</td>
          <td>${formatNumber(record.high)}</td>
          <td>${formatNumber(record.low)}</td>
          <td>${formatNumber(record.close)}</td>
          <td>${formatNumber(record.volume)}</td>
          <td>${formatValue(record.completeness_score)}%</td>
        </tr>
      `;
    })
    .join("");

  return `
    <div class="history-table-wrapper">
      <table class="history-table">
        <thead>
          <tr>
            <th>Data</th>
            <th>Open</th>
            <th>High</th>
            <th>Low</th>
            <th>Close</th>
            <th>Volume</th>
            <th>Completezza</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>

    <p class="muted-text">
      Tabella limitata agli ultimi 20 record restituiti dall’API.
      I dati sono descrittivi e non costituiscono consulenza finanziaria.
    </p>
  `;
}

function renderSecurityPatternCard(pattern) {
  return `
    <article class="pattern-card security-pattern-card">
      <div class="pattern-card__header">
        <div>
          <p class="eyebrow">${pattern.ticker}</p>
          <h3>${pattern.pattern_name}</h3>
        </div>

        <span class="quality-badge quality-badge--neutral">
          ${pattern.timeframe}
        </span>
      </div>

      <section class="description-box">
        <p>${pattern.explanation}</p>
      </section>

      <div class="technical-grid">
        <div>
          <p class="metric-label">Data rilevazione</p>
          <strong>${formatValue(pattern.detected_at)}</strong>
        </div>

        <div>
          <p class="metric-label">Finestra inizio</p>
          <strong>${formatValue(pattern.window_start)}</strong>
        </div>

        <div>
          <p class="metric-label">Finestra fine</p>
          <strong>${formatValue(pattern.window_end)}</strong>
        </div>

        <div>
          <p class="metric-label">Fonte</p>
          <strong>${formatValue(pattern.source_id)}</strong>
        </div>
      </div>

      ${renderPatternConditions(pattern)}

      <section class="audit-box">
        <p><strong>Limiti:</strong> ${pattern.limitations_note}</p>
        <p><strong>Computed at:</strong> ${formatValue(pattern.computed_at)}</p>
      </section>
    </article>
  `;
}

function renderPatternConditions(pattern) {
  const conditions = pattern.trigger_conditions_json;

  if (!conditions || typeof conditions !== "object") {
    return "";
  }

  const rows = Object.entries(conditions)
    .map(([key, value]) => {
      return `
        <p>
          <strong>${key}:</strong>
          ${typeof value === "object" ? JSON.stringify(value) : value}
        </p>
      `;
    })
    .join("");

  return `
    <section class="description-box">
      <p><strong>Condizioni osservate</strong></p>
      ${rows}
    </section>
  `;
}

function formatValue(value) {
  if (value === null || value === undefined || value === "") {
    return "n/d";
  }

  return value;
}

function formatNumber(value) {
  if (value === null || value === undefined || value === "") {
    return "n/d";
  }

  const numberValue = Number(value);

  if (Number.isNaN(numberValue)) {
    return value;
  }

  return new Intl.NumberFormat("it-IT", {
    maximumFractionDigits: 2
  }).format(numberValue);
}