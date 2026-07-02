import { fetchHistoricalPricesFromDb } from "../services/historical-market-api.js";
import { fetchTechnicalPatternsFromDb } from "../services/technical-patterns-api.js";
const securityDetailRuntimeState = {
  latestHistoryPayloadBySymbol: {},
  latestPatternsPayloadBySymbol: {}
};

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
            mentre storico giornaliero e pattern tecnici possono essere letti
            dal data layer Supabase.
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

      <section class="detail-section security-data-actions">
        <div class="security-data-actions__content">
          <div>
            <h3>Aggiorna dati titolo</h3>
            <p>
              Carica in sequenza lo storico giornaliero e i pattern tecnici reali
              dal data layer Supabase per questo titolo.
            </p>
          </div>

          <button
            class="button security-data-actions__button"
            type="button"
            onclick="refreshSecurityData('${security.ticker}')"
          >
            Aggiorna dati titolo
          </button>
        </div>

        <div id="security-refresh-status" class="description-box">
          Dati reali non ancora aggiornati in questa vista.
        </div>
      </section>


      <section class="detail-section security-live-summary-section">
        <div class="security-live-summary__header">
          <div>
            <h3>Riepilogo dati reali</h3>
            <p>
              Sintesi aggiornata dopo il caricamento dello storico e dei pattern tecnici
              dal data layer Supabase.
            </p>
          </div>

          <span class="quality-badge quality-badge--neutral">
            On demand
          </span>
        </div>

        <div id="security-live-summary" class="security-live-summary-grid">
          ${renderInitialSecurityLiveSummary(security.ticker)}
        </div>
      </section>


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
              Lettura dei pattern tecnici calcolati dal job
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

        <div id="security-technical-insight-summary"></div>

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

    securityDetailRuntimeState.latestHistoryPayloadBySymbol[symbol] = payload;
    updateSecurityLiveSummary(symbol);
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
  const insightEl = document.querySelector("#security-technical-insight-summary");
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

      if (insightEl) {
        insightEl.innerHTML = renderEmptyTechnicalInsightSummary(symbol);
      }

      return;
    }

    statusEl.innerHTML = `
      <p>
        Pattern tecnici recuperati correttamente da Supabase.
        Pattern disponibili: <strong>${patterns.length}</strong>.
      </p>
    `;

    if (insightEl) {
      insightEl.innerHTML = renderTechnicalInsightSummary(patterns);
    }

    stackEl.innerHTML = patterns.map(renderSecurityPatternCard).join("");

    securityDetailRuntimeState.latestPatternsPayloadBySymbol[symbol] = payload;
    updateSecurityLiveSummary(symbol);
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
  const miniChart = renderCloseMiniChart(records);

  return `
    ${miniChart}

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
  const visibleRecords = records.slice(0, 20);

  const tableRows = visibleRecords
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

  const mobileCards = visibleRecords
    .map((record) => {
      const closeValue = Number(record.close);
      const openValue = Number(record.open);

      const dailyDirection =
        !Number.isNaN(closeValue) && !Number.isNaN(openValue)
          ? closeValue >= openValue
            ? "daily-history-card--up"
            : "daily-history-card--down"
          : "";

      const dailyLabel =
        !Number.isNaN(closeValue) && !Number.isNaN(openValue)
          ? closeValue >= openValue
            ? "Close sopra/aperto"
            : "Close sotto/aperto"
          : "Direzione n/d";

      return `
        <article class="daily-history-card ${dailyDirection}">
          <div class="daily-history-card__header">
            <div>
              <p class="metric-label">Data</p>
              <h3>${formatValue(record.date)}</h3>
            </div>

            <span class="quality-badge quality-badge--neutral">
              ${formatValue(record.completeness_score)}%
            </span>
          </div>

          <div class="daily-history-card__main">
            <div>
              <p class="metric-label">Close</p>
              <strong>${formatNumber(record.close)}</strong>
            </div>

            <div>
              <p class="metric-label">Volume</p>
              <strong>${formatNumber(record.volume)}</strong>
            </div>
          </div>

          <div class="daily-history-card__ohlc">
            <div>
              <p class="metric-label">Open</p>
              <strong>${formatNumber(record.open)}</strong>
            </div>

            <div>
              <p class="metric-label">High</p>
              <strong>${formatNumber(record.high)}</strong>
            </div>

            <div>
              <p class="metric-label">Low</p>
              <strong>${formatNumber(record.low)}</strong>
            </div>
          </div>

          <section class="daily-history-card__footer">
            <p>
              ${dailyLabel}. Dato descrittivo giornaliero, senza valore predittivo
              o indicazione operativa.
            </p>
          </section>
        </article>
      `;
    })
    .join("");

  return `
    <div class="history-table-wrapper history-table-wrapper--desktop">
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
          ${tableRows}
        </tbody>
      </table>
    </div>

    <div class="daily-history-card-list">
      ${mobileCards}
    </div>

    <p class="muted-text">
      Vista limitata agli ultimi 20 record restituiti dall’API.
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
window.refreshSecurityData = async function refreshSecurityData(symbol) {
  const statusEl = document.querySelector("#security-refresh-status");

  updateSecurityLiveSummaryLoading(symbol);

  if (statusEl) {
    statusEl.innerHTML = `
      <p>
        Aggiornamento dati reali in corso per <strong>${symbol}</strong>.
        Step 1: storico giornaliero da Supabase.
      </p>
    `;
  }

  try {
    if (typeof window.loadSecurityHistory === "function") {
      await window.loadSecurityHistory(symbol);
    }

    if (statusEl) {
      statusEl.innerHTML = `
        <p>
          Storico giornaliero caricato. Step 2: caricamento pattern tecnici da Supabase.
        </p>
      `;
    }

    if (typeof window.loadSecurityTechnicalPatterns === "function") {
      await window.loadSecurityTechnicalPatterns(symbol);
    }

    if (statusEl) {
      statusEl.innerHTML = `
        <p>
          Aggiornamento completato per <strong>${symbol}</strong>.
          Storico e pattern tecnici sono stati richiesti al data layer Supabase.
        </p>
      `;
    }
  } catch (error) {
    if (statusEl) {
      statusEl.innerHTML = `
        <p><strong>Errore durante aggiornamento dati titolo:</strong> ${error.message}</p>
        <p>
          La scheda resta disponibile con dati mock e con eventuali dati già caricati.
        </p>
      `;
    }
  }
};

function renderInitialSecurityLiveSummary(symbol) {
  return `
    <article class="metric-card">
      <p class="metric-label">Ticker</p>
      <h3>${symbol}</h3>
    </article>

    <article class="metric-card">
      <p class="metric-label">Ultima chiusura</p>
      <h3>n/d</h3>
    </article>

    <article class="metric-card">
      <p class="metric-label">Record storici</p>
      <h3>0</h3>
    </article>

    <article class="metric-card">
      <p class="metric-label">Pattern tecnici</p>
      <h3>0</h3>
    </article>

    <article class="metric-card">
      <p class="metric-label">Fonte</p>
      <h3>mock</h3>
    </article>

    <article class="metric-card">
      <p class="metric-label">Ultimo aggiornamento</p>
      <h3>n/d</h3>
    </article>
  `;
}

function updateSecurityLiveSummaryLoading(symbol) {
  const summaryEl = document.querySelector("#security-live-summary");

  if (!summaryEl) {
    return;
  }

  summaryEl.innerHTML = `
    <article class="metric-card">
      <p class="metric-label">Ticker</p>
      <h3>${symbol}</h3>
    </article>

    <article class="metric-card">
      <p class="metric-label">Stato</p>
      <h3>Caricamento...</h3>
    </article>

    <article class="metric-card">
      <p class="metric-label">Record storici</p>
      <h3>in corso</h3>
    </article>

    <article class="metric-card">
      <p class="metric-label">Pattern tecnici</p>
      <h3>in corso</h3>
    </article>

    <article class="metric-card">
      <p class="metric-label">Fonte</p>
      <h3>Supabase</h3>
    </article>

    <article class="metric-card">
      <p class="metric-label">Ultimo aggiornamento</p>
      <h3>${new Date().toISOString()}</h3>
    </article>
  `;
}

function updateSecurityLiveSummary(symbol) {
  const summaryEl = document.querySelector("#security-live-summary");

  if (!summaryEl) {
    return;
  }

  const historyPayload =
    securityDetailRuntimeState.latestHistoryPayloadBySymbol[symbol];

  const patternsPayload =
    securityDetailRuntimeState.latestPatternsPayloadBySymbol[symbol];

  const historyRecords = historyPayload?.data?.records || [];
  const patterns = patternsPayload?.data?.patterns || [];

  const latestHistoryRecord = historyRecords[0] || null;
  const historyQuality = historyPayload?.data_quality || {};
  const patternQuality = patternsPayload?.data_quality || {};

  const latestClose = latestHistoryRecord?.close ?? null;
  const historyCount = historyRecords.length;
  const patternsCount = patterns.length;

  const sourceId =
    historyQuality.source_id ||
    patternQuality.source_id ||
    latestHistoryRecord?.source_id ||
    "n/d";

  const latestUpdate =
    historyQuality.fetched_at ||
    patternQuality.fetched_at ||
    latestHistoryRecord?.fetched_at ||
    "n/d";

  const latestDataAsOf =
    historyQuality.data_as_of ||
    patternQuality.data_as_of ||
    latestHistoryRecord?.date ||
    "n/d";

  const completeness =
    historyQuality.average_completeness_score !== undefined
      ? `${historyQuality.average_completeness_score}%`
      : "n/d";

  summaryEl.innerHTML = `
    <article class="metric-card">
      <p class="metric-label">Ticker</p>
      <h3>${symbol}</h3>
    </article>

    <article class="metric-card">
      <p class="metric-label">Ultima chiusura</p>
      <h3>${formatNumber(latestClose)}</h3>
    </article>

    <article class="metric-card">
      <p class="metric-label">Record storici</p>
      <h3>${historyCount}</h3>
    </article>

    <article class="metric-card">
      <p class="metric-label">Pattern tecnici</p>
      <h3>${patternsCount}</h3>
    </article>

    <article class="metric-card">
      <p class="metric-label">Fonte</p>
      <h3>${formatValue(sourceId)}</h3>
    </article>

    <article class="metric-card">
      <p class="metric-label">Data as of</p>
      <h3>${formatValue(latestDataAsOf)}</h3>
    </article>

    <article class="metric-card">
      <p class="metric-label">Completezza media</p>
      <h3>${formatValue(completeness)}</h3>
    </article>

    <article class="metric-card">
      <p class="metric-label">Ultimo aggiornamento</p>
      <h3>${formatValue(latestUpdate)}</h3>
    </article>
  `;
}

function renderCloseMiniChart(records) {
  const chartRecords = [...records]
    .filter((record) => record.date && record.close !== null && record.close !== undefined)
    .map((record) => ({
      date: record.date,
      close: Number(record.close)
    }))
    .filter((record) => !Number.isNaN(record.close))
    .reverse();

  if (chartRecords.length < 2) {
    return `
      <section class="mini-chart-card">
        <div class="mini-chart-card__header">
          <div>
            <p class="eyebrow">Price History</p>
            <h3>Mini chart close</h3>
          </div>
          <span class="quality-badge quality-badge--warning">Dati insufficienti</span>
        </div>

        <p class="muted-text">
          Servono almeno due record storici per disegnare una mini chart descrittiva.
        </p>
      </section>
    `;
  }

  const width = 320;
  const height = 120;
  const padding = 12;

  const closes = chartRecords.map((record) => record.close);
  const minClose = Math.min(...closes);
  const maxClose = Math.max(...closes);
  const closeRange = maxClose - minClose || 1;

  const points = chartRecords.map((record, index) => {
    const x =
      padding +
      (index / Math.max(chartRecords.length - 1, 1)) * (width - padding * 2);

    const y =
      height -
      padding -
      ((record.close - minClose) / closeRange) * (height - padding * 2);

    return {
      x,
      y,
      date: record.date,
      close: record.close
    };
  });

  const polylinePoints = points
    .map((point) => `${roundSvg(point.x)},${roundSvg(point.y)}`)
    .join(" ");

  const firstPoint = points[0];
  const lastPoint = points[points.length - 1];

  const directionClass =
    lastPoint.close >= firstPoint.close
      ? "mini-chart-card--up"
      : "mini-chart-card--down";

  const directionLabel =
    lastPoint.close >= firstPoint.close
      ? "Close finale sopra close iniziale"
      : "Close finale sotto close iniziale";

  const firstDate = firstPoint.date;
  const lastDate = lastPoint.date;

  return `
    <section class="mini-chart-card ${directionClass}">
      <div class="mini-chart-card__header">
        <div>
          <p class="eyebrow">Price History</p>
          <h3>Mini chart close</h3>
          <p class="muted-text">
            ${firstDate} → ${lastDate}
          </p>
        </div>

        <span class="quality-badge quality-badge--neutral">
          ${chartRecords.length} record
        </span>
      </div>

      <div class="mini-chart-card__body">
        <svg
          class="mini-chart"
          viewBox="0 0 ${width} ${height}"
          role="img"
          aria-label="Mini chart descrittiva dei prezzi di chiusura"
        >
          <line
            x1="${padding}"
            y1="${height - padding}"
            x2="${width - padding}"
            y2="${height - padding}"
            class="mini-chart__axis"
          />

          <line
            x1="${padding}"
            y1="${padding}"
            x2="${padding}"
            y2="${height - padding}"
            class="mini-chart__axis"
          />

          <polyline
            points="${polylinePoints}"
            fill="none"
            class="mini-chart__line"
          />

          <circle
            cx="${roundSvg(firstPoint.x)}"
            cy="${roundSvg(firstPoint.y)}"
            r="3"
            class="mini-chart__point"
          />

          <circle
            cx="${roundSvg(lastPoint.x)}"
            cy="${roundSvg(lastPoint.y)}"
            r="4"
            class="mini-chart__point mini-chart__point--latest"
          />
        </svg>
      </div>

      <div class="mini-chart-card__stats">
        <div>
          <p class="metric-label">Close iniziale</p>
          <strong>${formatNumber(firstPoint.close)}</strong>
        </div>

        <div>
          <p class="metric-label">Close finale</p>
          <strong>${formatNumber(lastPoint.close)}</strong>
        </div>

        <div>
          <p class="metric-label">Min / Max</p>
          <strong>${formatNumber(minClose)} / ${formatNumber(maxClose)}</strong>
        </div>
      </div>

      <section class="audit-box">
        <p>
          <strong>Lettura descrittiva:</strong>
          ${directionLabel}. La mini chart rappresenta solo l'andamento storico
          dei close disponibili e non genera previsioni o segnali operativi.
        </p>
      </section>
    </section>
  `;
}

function roundSvg(value) {
  return Math.round(Number(value) * 100) / 100;
}

function renderTechnicalInsightSummary(patterns) {
  const normalizedPatterns = [...patterns].sort((a, b) => {
    const dateA = new Date(a.computed_at || a.detected_at || a.window_end || 0);
    const dateB = new Date(b.computed_at || b.detected_at || b.window_end || 0);

    return dateB - dateA;
  });

  const latestPattern = normalizedPatterns[0];
  const patternNames = normalizedPatterns
    .map((pattern) => pattern.pattern_name)
    .filter(Boolean);

  const uniquePatternNames = Array.from(new Set(patternNames));

  return `
    <section class="technical-insight-summary-card">
      <div class="technical-insight-summary-card__header">
        <div>
          <p class="eyebrow">Technical Insight Summary</p>
          <h3>Sintesi pattern tecnici</h3>
          <p class="muted-text">
            Sintesi descrittiva dei pattern calcolati dal data layer Supabase.
          </p>
        </div>

        <span class="quality-badge quality-badge--neutral">
          ${patterns.length} pattern
        </span>
      </div>

      <div class="technical-insight-summary-grid">
        <article class="metric-card">
          <p class="metric-label">Ultimo pattern</p>
          <h3>${formatValue(latestPattern?.pattern_name)}</h3>
        </article>

        <article class="metric-card">
          <p class="metric-label">Timeframe</p>
          <h3>${formatValue(latestPattern?.timeframe)}</h3>
        </article>

        <article class="metric-card">
          <p class="metric-label">Data rilevazione</p>
          <h3>${formatValue(latestPattern?.detected_at)}</h3>
        </article>

        <article class="metric-card">
          <p class="metric-label">Finestra dati</p>
          <h3>${formatValue(latestPattern?.window_start)} → ${formatValue(latestPattern?.window_end)}</h3>
        </article>

        <article class="metric-card">
          <p class="metric-label">Fonte</p>
          <h3>${formatValue(latestPattern?.source_id)}</h3>
        </article>

        <article class="metric-card">
          <p class="metric-label">Computed at</p>
          <h3>${formatValue(latestPattern?.computed_at)}</h3>
        </article>
      </div>

      <section class="description-box">
        <p>
          <strong>Pattern disponibili:</strong>
          ${uniquePatternNames.length ? uniquePatternNames.join(", ") : "n/d"}.
        </p>
      </section>

      <section class="audit-box">
        <p>
          <strong>Nota metodologica:</strong>
          questa sintesi descrive condizioni tecniche osservate sui dati storici disponibili.
          Non rappresenta una previsione, un segnale operativo o una raccomandazione finanziaria.
        </p>
      </section>
    </section>
  `;
}

function renderEmptyTechnicalInsightSummary(symbol) {
  return `
    <section class="technical-insight-summary-card technical-insight-summary-card--empty">
      <div class="technical-insight-summary-card__header">
        <div>
          <p class="eyebrow">Technical Insight Summary</p>
          <h3>Nessun pattern disponibile</h3>
          <p class="muted-text">
            Non sono presenti pattern tecnici reali per ${symbol}.
          </p>
        </div>

        <span class="quality-badge quality-badge--warning">
          0 pattern
        </span>
      </div>

      <section class="note-box">
        Esegui il job tecnico per calcolare i pattern:
        <code>/api/jobs/detect-technical-patterns?symbols=${symbol}&limit=260&secret=...</code>
      </section>
    </section>
  `;
}
