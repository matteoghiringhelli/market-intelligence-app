export default async function handler(req, res) {
  const symbol = String(req.query.symbol || "AAPL").trim().toUpperCase();
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: "MISSING_ALPHA_VANTAGE_API_KEY",
      message: "La variabile ALPHA_VANTAGE_API_KEY non è configurata su Vercel.",
      source_id: "alpha_vantage",
      fetched_at: new Date().toISOString()
    });
  }

  if (!symbol) {
    return res.status(400).json({
      error: "MISSING_SYMBOL",
      message: "Parametro symbol mancante. Esempio corretto: /api/market/quote?symbol=AAPL",
      source_id: "alpha_vantage",
      fetched_at: new Date().toISOString()
    });
  }

  const url = new URL("https://www.alphavantage.co/query");
  url.searchParams.set("function", "GLOBAL_QUOTE");
  url.searchParams.set("symbol", symbol);
  url.searchParams.set("apikey", apiKey);

  try {
    const response = await fetch(url.toString());

    if (!response.ok) {
      return res.status(response.status).json({
        error: "SOURCE_HTTP_ERROR",
        message: "Errore HTTP ricevuto dalla fonte dati esterna.",
        status: response.status,
        source_id: "alpha_vantage",
        fetched_at: new Date().toISOString()
      });
    }

    const raw = await response.json();

    if (raw.Note || raw.Information) {
      return res.status(429).json({
        error: "SOURCE_RATE_LIMIT_OR_INFORMATION",
        message: raw.Note || raw.Information,
        source_id: "alpha_vantage",
        fetched_at: new Date().toISOString()
      });
    }

    if (raw["Error Message"]) {
      return res.status(400).json({
        error: "SOURCE_ERROR_MESSAGE",
        message: raw["Error Message"],
        source_id: "alpha_vantage",
        fetched_at: new Date().toISOString()
      });
    }

    const quote = raw["Global Quote"] || {};

    const normalized = {
      symbol,
      price: quote["05. price"] || null,
      open: quote["02. open"] || null,
      high: quote["03. high"] || null,
      low: quote["04. low"] || null,
      volume: quote["06. volume"] || null,
      latestTradingDay: quote["07. latest trading day"] || null,
      previousClose: quote["08. previous close"] || null,
      change: quote["09. change"] || null,
      changePercent: quote["10. change percent"] || null,

      source_id: "alpha_vantage",
      fetched_at: new Date().toISOString(),
      data_as_of: quote["07. latest trading day"] || null,
      completeness_score: calculateCompletenessScore(quote)
    };

    return res.status(200).json({
      data: normalized,
      data_quality: {
        source_id: "alpha_vantage",
        fetched_at: normalized.fetched_at,
        data_as_of: normalized.data_as_of,
        completeness_score: normalized.completeness_score
      },
      disclaimer:
        "Finalità esclusivamente informativa ed educativa. Nessuna consulenza finanziaria, nessun segnale operativo, nessuna raccomandazione buy/sell."
    });
  } catch (error) {
    return res.status(500).json({
      error: "QUOTE_FETCH_FAILED",
      message: "Impossibile recuperare la quote dalla fonte esterna.",
      details: error.message,
      source_id: "alpha_vantage",
      fetched_at: new Date().toISOString()
    });
  }
}

function calculateCompletenessScore(quote) {
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
