import { fetchRealQuote } from "../services/real-market-api.js";

const defaultSymbols = ["AAPL", "MSFT", "JPM"];

export function renderRealDataTestPage() {
  setTimeout(loadRealQuotes, 0);

  return `
    <header class="app-header">
      <div>
        <p class="eyebrow">Real Data Integration</p>
        <h1>Real Data Test</h1>
        <p class="subtitle">
          Prima pagina collegata a una fonte dati reale tramite Vercel API Route.
          I dati sono mostrati solo a finalità informativa ed educativa.
        </p>
      </div>
    </header>

    <section class="panel">
      <div class="panel-header">
        <div>
          <h2>Quote reali via Alpha Vantage</h2>
          <p>
            Questa pagina recupera dati reali passando dal backend serverless Vercel.
            La API key resta nascosta e non viene esposta nel frontend.
          </p>
        </div>
      </div>

      <section class="note-box">
        <strong>Nota importante:</strong>
        i dati mostrati sono descrittivi. Questa app non fornisce consulenza finanziaria,
        segnali operativi, raccomandazioni buy/sell o indicazioni personalizzate.
      </section>

      <div id="real-data-status" class="description-box">
        Caricamento dati reali...
      </div>

      <div id="real-data-grid" class="real-data-grid"></div>
    </section>
  `;
}

async function loadRealQuotes() {
  const statusEl = document.querySelector("#real-data-status");
  const gridEl = document.querySelector("#real-data-grid");

  if (!statusEl || !gridEl) return;

  try {
    const results = await Promise.all(
      defaultSymbols.map(async (symbol) => {
        const payload = await fetchRealQuote(symbol);
        return payload.data;
      })
    );

    statusEl.innerHTML = `
      <p>
        Dati recuperati correttamente dalla fonte esterna tramite Vercel API Route.
        Ogni card include fonte, timestamp, data di riferimento e completezza.
      </p>
    `;

    gridEl.innerHTML = results.map(renderQuoteCard).join("");
  } catch (error) {
    statusEl.innerHTML = `
      <p><strong>Errore nel recupero dati:</strong> ${error.message}</p>
      <p>
        Se questo errore appare solo localmente, verifica il test direttamente su Vercel.
        Se appare anche su Vercel, controlla la route API e la variabile
        <code>ALPHA_VANTAGE_API_KEY</code>.
      </p>
    `;

    gridEl.innerHTML = "";
  }
}

function renderQuoteCard(quote) {
  const completenessClass =
    quote.completeness_score >= 80
      ? "quality-badge--ok"
      : "quality-badge--warning";

  return `
    <article class="real-quote-card">
      <div class="real-quote-card__header">
        <div>
          <p class="eyebrow">${quote.source_id}</p>
          <h3>${quote.symbol}</h3>
        </div>

        <span class="quality-badge ${completenessClass}">
          Completezza ${quote.completeness_score}%
        </span>
      </div>

      <div class="real-quote-grid">
        <div>
          <p class="metric-label">Prezzo</p>
          <strong>${formatValue(quote.price)}</strong>
        </div>

        <div>
          <p class="metric-label">Variazione</p>
          <strong>${formatValue(quote.changePercent)}</strong>
        </div>

        <div>
          <p class="metric-label">Volume</p>
          <strong>${formatValue(quote.volume)}</strong>
        </div>

        <div>
          <p class="metric-label">Data dato</p>
          <strong>${formatValue(quote.data_as_of)}</strong>
        </div>
      </div>

      <section class="audit-box">
        <p><strong>Fonte:</strong> ${quote.source_id}</p>
        <p><strong>Fetched at:</strong> ${quote.fetched_at}</p>
        <p><strong>Data as of:</strong> ${formatValue(quote.data_as_of)}</p>
        <p>
          <strong>Perimetro:</strong>
          dato mostrato a finalità informativa ed educativa. Nessun segnale operativo.
        </p>
      </section>
    </article>
  `;
}

function formatValue(value) {
  if (value === null || value === undefined || value === "") {
    return "n/d";
  }

  return value;
}