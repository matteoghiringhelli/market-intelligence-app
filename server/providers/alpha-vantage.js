export async function fetchAlphaVantageQuote(symbol) {
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;

  if (!apiKey) {
    return {
      ok: false,
      status: 500,
      payload: {
        error: "MISSING_ALPHA_VANTAGE_API_KEY",
        message: "La variabile ALPHA_VANTAGE_API_KEY non è configurata su Vercel.",
        source_id: "alpha_vantage",
        fetched_at: new Date().toISOString()
      }
    };
  }

  const url = new URL("https://www.alphavantage.co/query");
  url.searchParams.set("function", "GLOBAL_QUOTE");
  url.searchParams.set("symbol", symbol);
  url.searchParams.set("apikey", apiKey);

  try {
    const response = await fetch(url.toString());

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        payload: {
          error: "ALPHA_HTTP_ERROR",
          message: "Errore HTTP ricevuto da Alpha Vantage.",
          status: response.status,
          source_id: "alpha_vantage",
          fetched_at: new Date().toISOString()
        }
      };
    }

    const raw = await response.json();

    if (raw.Note || raw.Information) {
      return {
        ok: false,
        status: 429,
        payload: {
          error: "ALPHA_RATE_LIMIT_OR_INFORMATION",
          message: raw.Note || raw.Information,
          source_id: "alpha_vantage",
          fetched_at: new Date().toISOString()
        }
      };
    }

    if (raw["Error Message"]) {
      return {
        ok: false,
        status: 400,
        payload: {
          error: "ALPHA_ERROR_MESSAGE",
          message: raw["Error Message"],
          source_id: "alpha_vantage",
          fetched_at: new Date().toISOString()
        }
      };
    }

    const quote = raw["Global Quote"] || {};
    const fetchedAt = new Date().toISOString();

    const normalized = {
      symbol,
      name: null,
      price: normalizeNumber(quote["05. price"]),
      open: normalizeNumber(quote["02. open"]),
      high: normalizeNumber(quote["03. high"]),
      low: normalizeNumber(quote["04. low"]),
      volume: normalizeNumber(quote["06. volume"]),
      previousClose: normalizeNumber(quote["08. previous close"]),
      change: normalizeNumber(quote["09. change"]),
      changePercent: quote["10. change percent"] || null,
      marketCap: null,
      exchange: null,

      source_id: "alpha_vantage",
      fetched_at: fetchedAt,
      data_as_of: quote["07. latest trading day"] || null,
      completeness_score: calculateAlphaCompletenessScore(quote)
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
        error: "ALPHA_FETCH_FAILED",
        message: "Impossibile recuperare la quote da Alpha Vantage.",
        details: error.message,
        source_id: "alpha_vantage",
        fetched_at: new Date().toISOString()
      }
    };
  }
}

function calculateAlphaCompletenessScore(quote) {
  const requiredFields = [
    "01. symbol",
    "02. open",
    "03. high",
    "04. low",
    "05. price",
    "06. volume",
    "07. latest trading day",
    "08. previous close",
    "09. change",
    "10. change percent"
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