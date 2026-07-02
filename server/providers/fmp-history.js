const HISTORY_CACHE_TTL_MS = 12 * 60 * 60 * 1000;

globalThis.fmpHistoricalPriceCache = globalThis.fmpHistoricalPriceCache || new Map();

export async function fetchFmpHistoricalPrices({
  symbol,
  from,
  to,
  useCache = true
}) {
  const apiKey = process.env.FMP_API_KEY;
  const normalizedSymbol = String(symbol || "").trim().toUpperCase();

  if (!normalizedSymbol) {
    return {
      ok: false,
      status: 400,
      payload: {
        error: "MISSING_SYMBOL",
        message: "Parametro symbol mancante.",
        source_id: "financial_modeling_prep",
        fetched_at: new Date().toISOString()
      }
    };
  }

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

  const cacheKey = buildHistoryCacheKey({
    symbol: normalizedSymbol,
    from,
    to
  });

  if (useCache) {
    const cachedPayload = getCachedHistoricalPrices(cacheKey);

    if (cachedPayload) {
      return {
        ok: true,
        status: 200,
        payload: {
          ...cachedPayload,
          cache: {
            status: "hit",
            ttl_hours: 12
          }
        }
      };
    }
  }

  const url = new URL("https://financialmodelingprep.com/stable/historical-price-eod/full");
  url.searchParams.set("symbol", normalizedSymbol);
  url.searchParams.set("apikey", apiKey);

  if (from) {
    url.searchParams.set("from", from);
  }

  if (to) {
    url.searchParams.set("to", to);
  }

  try {
    const response = await fetch(url.toString());

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        payload: {
          error: "FMP_HISTORY_HTTP_ERROR",
          message: "Errore HTTP ricevuto da Financial Modeling Prep durante il recupero storico.",
          status: response.status,
          source_id: "financial_modeling_prep",
          fetched_at: new Date().toISOString()
        }
      };
    }

    const raw = await response.json();
    const rows = normalizeFmpHistoricalRows(raw);

    if (!rows.length) {
      return {
        ok: false,
        status: 404,
        payload: {
          error: "FMP_HISTORY_EMPTY_RESPONSE",
          message: `Nessun dato storico disponibile per ${normalizedSymbol}.`,
          source_id: "financial_modeling_prep",
          fetched_at: new Date().toISOString()
        }
      };
    }

    const fetchedAt = new Date().toISOString();

    const normalizedRows = rows.map((row) => {
      return {
        symbol: row.symbol || normalizedSymbol,
        date: row.date || null,
        open: normalizeNumber(row.open),
        high: normalizeNumber(row.high),
        low: normalizeNumber(row.low),
        close: normalizeNumber(row.close),
        volume: normalizeNumber(row.volume),
        change: normalizeNumber(row.change),
        changePercent: normalizeNumber(row.changePercent),
        vwap: normalizeNumber(row.vwap),

        source_id: "financial_modeling_prep",
        fetched_at: fetchedAt,
        data_as_of: row.date || null,
        completeness_score: calculateHistoricalRowCompletenessScore(row)
      };
    });

    const payload = {
      data: {
        symbol: normalizedSymbol,
        provider: "fmp",
        source_id: "financial_modeling_prep",
        fetched_at: fetchedAt,
        from: from || null,
        to: to || null,
        records_count: normalizedRows.length,
        latest_record_date: normalizedRows[0]?.date || null,
        records: normalizedRows
      },
      data_quality: {
        source_id: "financial_modeling_prep",
        fetched_at: fetchedAt,
        data_as_of: normalizedRows[0]?.date || null,
        records_count: normalizedRows.length,
        average_completeness_score: calculateAverageCompleteness(normalizedRows)
      },
      disclaimer:
        "Finalità esclusivamente informativa ed educativa. Dati storici descrittivi, nessuna consulenza finanziaria, nessun segnale operativo."
    };

    setCachedHistoricalPrices(cacheKey, payload);

    return {
      ok: true,
      status: 200,
      payload: {
        ...payload,
        cache: {
          status: "miss",
          ttl_hours: 12
        }
      }
    };
  } catch (error) {
    return {
      ok: false,
      status: 500,
      payload: {
        error: "FMP_HISTORY_FETCH_FAILED",
        message: "Impossibile recuperare i dati storici da Financial Modeling Prep.",
        details: error.message,
        source_id: "financial_modeling_prep",
        fetched_at: new Date().toISOString()
      }
    };
  }
}

function normalizeFmpHistoricalRows(raw) {
  if (Array.isArray(raw)) {
    return raw;
  }

  if (Array.isArray(raw?.historical)) {
    return raw.historical;
  }

  if (Array.isArray(raw?.data)) {
    return raw.data;
  }

  return [];
}

function calculateHistoricalRowCompletenessScore(row) {
  const requiredFields = ["date", "open", "high", "low", "close", "volume"];

  const availableFields = requiredFields.filter((field) => {
    return row[field] !== undefined && row[field] !== null && row[field] !== "";
  });

  return Math.round((availableFields.length / requiredFields.length) * 100);
}

function calculateAverageCompleteness(rows) {
  if (!rows.length) {
    return 0;
  }

  const total = rows.reduce((sum, row) => {
    return sum + Number(row.completeness_score || 0);
  }, 0);

  return Math.round(total / rows.length);
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

function buildHistoryCacheKey({ symbol, from, to }) {
  return `fmp-history:${symbol}:${from || "none"}:${to || "none"}`;
}

function getCachedHistoricalPrices(cacheKey) {
  const cacheItem = globalThis.fmpHistoricalPriceCache.get(cacheKey);

  if (!cacheItem) {
    return null;
  }

  const ageMs = Date.now() - cacheItem.cachedAt;

  if (ageMs > HISTORY_CACHE_TTL_MS) {
    globalThis.fmpHistoricalPriceCache.delete(cacheKey);
    return null;
  }

  return cacheItem.payload;
}

function setCachedHistoricalPrices(cacheKey, payload) {
  globalThis.fmpHistoricalPriceCache.set(cacheKey, {
    cachedAt: Date.now(),
    payload
  });
}