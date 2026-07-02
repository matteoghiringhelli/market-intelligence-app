import { mockTechnicalPatterns } from "../data/mock-technical-patterns.js";
import { fetchTechnicalPatternsFromDb } from "../services/technical-patterns-api.js";

let selectedPatternSymbol = "AAPL";
const availablePatternSymbols = ["AAPL", "MSFT", "JPM", "NVDA", "AMZN"];

function renderPatternCard(pattern) {
  return `
    <article class="pattern-card">
      <div class="pattern-card__header">
        <div>
          <p class="eyebrow">${pattern.ticker}</p>
          <h3>${pattern.pattern_name || pattern.patternName}</h3>
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
          <strong>${formatValue(pattern.detected_at || pattern.detectedAt)}</strong>
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
          <strong>${formatValue(pattern.source_id || pattern.source)}</strong>
        </div>
      </div>

      ${renderTriggerConditions(pattern)}

      <section class="audit-box">
        <p><strong>Limiti:</strong> ${pattern.limitations_note || pattern.limitations}</p>
        ${
          pattern.computed_at
            ? `<p><strong>Computed at:</strong> ${pattern.computed_at}</p>`
            : ""
        }
      </section>
    </article>
  `;
}

function renderTriggerConditions(pattern) {
  const conditions =
    pattern.trigger_conditions_json ||
    (pattern.triggerConditions
      ? { condition: pattern.triggerConditions }
      : null);

  if (!conditions) {
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

function renderSymbolButton(symbol) {
  const activeClass = selectedPatternSymbol === symbol ? "symbol-button--active" : "";

  return `
    <button
      class="symbol-button ${activeClass}"
      type="button"
      onclick="selectPatternSymbol('${symbol}')"
    >
      ${symbol}
    </button>
  `;
}

export function renderTechnicalPatternsPage() {
  setTimeout(() => loadRealTechnicalPatterns(selectedPatternSymbol), 0);

  const mockCards = mockTechnicalPatterns.map((pattern) => {
    return renderPatternCard({
      ticker: pattern.ticker,
      pattern_name: pattern.patternName,
      timeframe: pattern.timeframe,
      explanation: pattern.explanation,
      detected_at: pattern.detectedAt,
      source_id: pattern.source,
      limitations_note: pattern.limitations,
      trigger_conditions_json: {
        condition: pattern.triggerConditions
      }
    });
  }).join("");

  return `
    <header class="app-header">
      <div>
        <p class="eyebrow">Technical Descriptive Layer</p>
        <h1>Technical Patterns</h1>
        <p class="subtitle">
          Pattern tecnici descrittivi calcolati dallo storico salvato in Supabase.
          Nessun segnale operativo viene generato.
        </p>
      </div>
    </header>

    <section class="panel">
      <div class="panel-header">
        <div>
          <h2>Pattern tecnici reali da Supabase</h2>
          <p>
            Se i dati reali non sono ancora disponibili, la pagina mantiene sotto
            un set mock come fallback educativo.
          </p>
        </div>
      </div>

      <section class="selector-section">
        <p class="selector-label">Ticker</p>
        <div class="symbol-selector">
          ${availablePatternSymbols.map(renderSymbolButton).join("")}
        </div>
      </section>

      <div id="technical-patterns-status" class="description-box">
        Caricamento pattern tecnici per ${selectedPatternSymbol}...
      </div>

      <div id="technical-patterns-real-stack" class="stack"></div>

      <section class="detail-section">
        <h3>Fallback mock educativo</h3>
        <p class="muted-text">
          Questi pattern mock restano disponibili per confronto UX se il data layer reale
          non è ancora popolato.
        </p>
        <div class="stack">
          ${mockCards}
        </div>
      </section>
    </section>
  `;
}

window.selectPatternSymbol = function selectPatternSymbol(symbol) {
  selectedPatternSymbol = symbol;
  updatePatternSymbolButtons();
  loadRealTechnicalPatterns(symbol);
};

async function loadRealTechnicalPatterns(symbol) {
  const statusEl = document.querySelector("#technical-patterns-status");
  const stackEl = document.querySelector("#technical-patterns-real-stack");

  if (!statusEl || !stackEl) {
    return;
  }

  statusEl.innerHTML = `
    <p>Caricamento pattern reali per <strong>${symbol}</strong> da Supabase...</p>
  `;

  stackEl.innerHTML = "";

  try {
    const payload = await fetchTechnicalPatternsFromDb(symbol, 20);
    const patterns = payload?.data?.patterns || [];

    if (!patterns.length) {
      statusEl.innerHTML = `
        <p>
          Nessun pattern reale trovato per <strong>${symbol}</strong>.
        </p>
        <p>
          Esegui prima:
          <code>/api/jobs/detect-technical-patterns?symbols=${symbol}&secret=...</code>
        </p>
      `;

      return;
    }

    statusEl.innerHTML = `
      <p>
        Pattern reali recuperati da Supabase.
        Record disponibili: <strong>${patterns.length}</strong>.
      </p>
    `;

    stackEl.innerHTML = patterns.map(renderPatternCard).join("");
  } catch (error) {
    statusEl.innerHTML = `
      <p><strong>Errore recupero pattern reali:</strong> ${error.message}</p>
      <p>
        La pagina resta disponibile con pattern mock. Verifica Supabase, il job tecnico
        e la tabella <code>technical_patterns</code>.
      </p>
    `;
  }
}

function updatePatternSymbolButtons() {
  const buttons = document.querySelectorAll(".symbol-button");

  buttons.forEach((button) => {
    const isActive = button.textContent.trim() === selectedPatternSymbol;
    button.classList.toggle("symbol-button--active", isActive);
  });
}

function formatValue(value) {
  if (value === null || value === undefined || value === "") {
    return "n/d";
  }

  return value;
}