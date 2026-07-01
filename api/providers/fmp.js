export async function fetchFmpQuote(symbol) {
  const apiKey = process.env.FMP_API_KEY;

  if (!apiKey) {
    return {
      ok: false,
      status: 500,
      payload: {
        error: "MISSING_FMP_API_KEY",
        message: "La variabile FMP_API_KEY non è configurata su Vercel.",
        source_id: "financial_modeling_prep",
        fetched_at: new Date().toISOString()
      }
    };
  }

  const url = new URL("https://financialmodelingprep.com/stable/quote");
  url.searchParams.set("symbol", symbol);
  url.searchParams.set("apikey", apiKey);

  try {
    const response = await fetch(url.toString());

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        payload: {
          error: "FMP_HTTP_ERROR",
          message: "Errore HTTP ricevuto da Financial Modeling Prep.",
          status: response.status,
          source_id: "financial_modeling_prep",
          fetched_at: new Date().toISOString()
        }
      };
    }

    const raw = await response.json();

    if (!Array.isArray(raw) || raw.length === 0) {
      return {
        ok: false,
        status: 404,
        payload: {
          error: "FMP_EMPTY_RESPONSE",
          message: `Nessuna quote disponibile per ${symbol}.`,
          source_id: "financial_modeling_prep",
          fetched_at: new Date().toISOString()
        }
      };
    }

    const quote = raw[0];
    const fetchedAt = new Date().toISOString();

    const normalized = {
      symbol: quote.symbol || symbol,
      name: quote.name || null,
      price: normalizeNumber(quote.price),
      open: normalizeNumber(quote.open),
      high: normalizeNumber(quote.dayHigh),
      low: normalizeNumber(quote.dayLow),
      volume: normalizeNumber(quote.volume),
      previousClose: normalizeNumber(quote.previousClose),
      change: normalizeNumber(quote.change),
      changePercent: normalizeNumber(quote.changesPercentage),
      marketCap: normalizeNumber(quote.marketCap),
      exchange: quote.exchange || null,

      source_id: "financial_modeling_prep",
      fetched_at: fetchedAt,
      data_as_of: quote.timestamp ? new Date(quote.timestamp * 1000).toISOString() : null,
      completeness_score: calculateFmpCompletenessScore(quote)
    };

    return {
      ok: true,
      status: 200,
      payload: {
        data: normalized,
        data_quality: {
          source_id: normalized.source_id,
          fetched_at: normalized.fetched_at,
          data_as_of: normalized.data_as_of,
          completeness_score: normalized.completeness_score
        },
        disclaimer:
          "Finalità esclusivamente informativa ed educativa. Nessuna consulenza finanziaria, nessun segnale operativo, nessuna raccomandazione buy/sell."
      }
    };
  } catch (error) {
    return {
      ok: false,
      status: 500,
      payload: {
        error: "FMP_FETCH_FAILED",
        message: "Impossibile recuperare la quote da Financial Modeling Prep.",
        details: error.message,
        source_id: "financial_modeling_prep",
        fetched_at: new Date().toISOString()
      }
    };
  }
}

function calculateFmpCompletenessScore(quote) {
  const requiredFields = [
    "symbol",
    "price",
    "open",
    "dayHigh",
    "dayLow",
    "volume",
    "previousClose",
    "change",
    "changesPercentage"
  ];

  const availableFields = requiredFields.filter((field) => {
    return quote[field] !== undefined && quote[field] !== null && quote[field] !== "";
  });

  return Math.round((availableFields.length / requiredFields.length) * 100);
}

function normalizeNumber(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const numberValue = Number(value);

  if (Number.isNaN(numberValue)) {
    return null;
  }

  return numberValue;
}