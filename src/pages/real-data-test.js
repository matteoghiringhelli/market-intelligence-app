import { fetchRealQuote } from "../services/real-market-api.js";

const availableSymbols = ["AAPL", "MSFT", "JPM", "NVDA", "AMZN"];
const availableProviders = [
  {
    id: "fmp",
    label: "FMP"
  },
  {
    id: "alpha",
    label: "Alpha Vantage"
  }
];

let selectedRealSymbol = "AAPL";
let selectedProvider = "fmp";

export function renderRealDataTestPage() {
  setTimeout(() => loadRealQuote(selectedRealSymbol, selectedProvider), 0);

  return `
    <header class="app-header">
      <div>
        <p class="eyebrow">Real Data Integration</p>
        <h1>Real Data Test</h1>
        <p class="subtitle">
          Pagina collegata a provider reali tramite Vercel API Route.
          FMP è il provider principale; Alpha Vantage resta disponibile come fallback.
        </p>
      </div>
    </header>

    <section class="panel">
      <div class="panel-header">
        <div>
          <h2>Quote reale multi-provider</h2>
          <p>
            Il frontend chiama solo <code>/api/market/quote</code>.
            La scelta del provider avviene lato API/BFF.
          </p>
        </div>
      </div>

      <section class="note-box">
        <strong>Nota limiti free:</strong>
        anche con provider più generosi, questa pagina carica un solo ticker alla volta
        e usa cache lato API per ridurre chiamate duplicate.
      </section>

      <div class="selector-section">
        <p class="selector-label">Provider</p>
        <div class="symbol-selector">
          ${availableProviders.map(renderProviderButton).join("")}
        </div>
      </div>

      <div class="selector-section">
        <p class="selector-label">Ticker</p>
        <div class="symbol-selector">
          ${availableSymbols.map(renderSymbolButton).join("")}
        </div>
      </div>

      <div id="real-data-status" class="description-box">
        Caricamento dati reali per ${selectedRealSymbol}...
      </div>

      <div id="real-data-grid" class="real-data-grid"></div>
    </section>
  `;
}

function renderProviderButton(provider) {
  const activeClass = selectedProvider === provider.id ? "symbol-button--active" : "";

  return `
    <button
      class="symbol-button ${activeClass}"
      type="button"
      onclick="selectRealProvider('${provider.id}')"
    >
      ${provider.label}
    </button>
  `;
}

function renderSymbolButton(symbol) {
  const activeClass = selectedRealSymbol === symbol ? "symbol-button--active" : "";

  return `
    <button
      class="symbol-button ${activeClass}"
      type="button"
      onclick="selectRealSymbol('${symbol}')"
    >
      ${symbol}
    </button>
  `;
}

window.selectRealProvider = function selectRealProvider(provider) {
  selectedProvider = provider;
  updateSelectorButtons();
  loadRealQuote(selectedRealSymbol, selectedProvider);
};

window.selectRealSymbol = function selectRealSymbol(symbol) {
  selectedRealSymbol = symbol;
  updateSelectorButtons();
  loadRealQuote(selectedRealSymbol, selectedProvider);
};

async function loadRealQuote(symbol, provider) {
  const statusEl = document.querySelector("#real-data-status");
  const gridEl = document.querySelector("#real-data-grid");

  if (!statusEl || !gridEl) return;

  statusEl.innerHTML = `
    <p>
      Caricamento dati reali per <strong>${symbol}</strong>
      tramite provider <strong>${provider}</strong>...
    </p>
  `;

  gridEl.innerHTML = "";

  try {
    const payload = await fetchRealQuote(symbol, provider);
    const quote = payload.data;

    statusEl.innerHTML = `
      <p>
        Dato recuperato correttamente tramite Vercel API Route.
        Provider: <strong>${payload.provider || provider}</strong>.
        Cache API: <strong>${payload.cache?.status || "n/d"}</strong>.
      </p>
    `;

    gridEl.innerHTML = renderQuoteCard(quote, payload);
  } catch (error) {
    statusEl.innerHTML = `
      <p><strong>Messaggio dalla fonte o dalla API:</strong></p>
      <p>${error.message}</p>
      <p>
        Se il messaggio riguarda limiti free, la connessione funziona ma il provider
        ha bloccato temporaneamente la richiesta.
      </p>
    `;

    gridEl.innerHTML = "";
  }
}

function renderQuoteCard(quote, payload) {
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
          ${quote.name ? `<p class="muted-text">${quote.name}</p>` : ""}
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
        <p><strong>Provider route:</strong> ${payload.provider || "n/d"}</p>
        <p><strong>Fetched at:</strong> ${quote.fetched_at}</p>
        <p><strong>Data as of:</strong> ${formatValue(quote.data_as_of)}</p>
        <p><strong>Cache:</strong> ${payload.cache?.status || "n/d"}</p>
        <p>
          <strong>Perimetro:</strong>
          dato mostrato a finalità informativa ed educativa. Nessun segnale operativo.
        </p>
      </section>
    </article>
  `;
}

function updateSelectorButtons() {
  const buttons = document.querySelectorAll(".symbol-button");

  buttons.forEach((button) => {
    const value = button.textContent.trim();

    const provider = availableProviders.find((item) => item.label === value);
    const isProviderActive = provider && provider.id === selectedProvider;
    const isSymbolActive = value === selectedRealSymbol;

    button.classList.toggle("symbol-button--active", isProviderActive || isSymbolActive);
  });
}

function formatValue(value) {
  if (value === null || value === undefined || value === "") {
    return "n/d";
  }

  return value;
}