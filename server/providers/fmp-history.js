const YAHOO_CHART_BASE_URL = "https://query1.finance.yahoo.com/v8/finance/chart";

export async function fetchFmpHistoricalPrices({
  symbol,
  from,
  to,
  useCache = false
}) {
  return fetchYahooHistoricalPrices({
    symbol,
    from,
    to,
    useCache
  });
}

async function fetchYahooHistoricalPrices({
  symbol,
  from,
  to
}) {
  const fetchedAt = new Date().toISOString();
  const normalizedSymbol = normalizeYahooSymbol(symbol);

  if (!normalizedSymbol) {
    return {
      ok: false,
      status: 400,
      payload: {
        error: "UNSUPPORTED_HISTORY_SYMBOL",
        message:
          "Ticker non supportato dal provider storico V1. Sono ammessi solo ticker equity semplici.",
        symbol,
        source_id: "yahoo_chart",
        fetched_at: fetchedAt
      }
    };
  }

  try {
    const period1 = toUnixSeconds(startOfDate(from));
    const period2 = toUnixSeconds(addDays(startOfDate(to), 1));

    const url = new URL(`${YAHOO_CHART_BASE_URL}/${encodeURIComponent(normalizedSymbol)}`);
    url.searchParams.set("period1", String(period1));
    url.searchParams.set("period2", String(period2));
    url.searchParams.set("interval", "1d");
    url.searchParams.set("events", "history");
    url.searchParams.set("includeAdjustedClose", "true");

    const response = await fetch(url.toString(), {
      headers: {
        "User-Agent":
          "Mozilla/5.0 MarketIntelligenceApp/1.0 educational data retrieval"
      }
    });

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        payload: {
          error: "YAHOO_HISTORY_HTTP_ERROR",
          message:
            "Errore HTTP ricevuto da Yahoo Chart durante il recupero storico.",
          status: response.status,
          symbol,
          normalized_symbol: normalizedSymbol,
          source_id: "yahoo_chart",
          fetched_at: fetchedAt
        }
      };
    }

    const raw = await response.json();
    const chartResult = raw?.chart?.result?.[0];

    if (!chartResult) {
      return {
        ok: false,
        status: 502,
        payload: {
          error: "YAHOO_HISTORY_EMPTY_RESULT",
          message: "Yahoo Chart non ha restituito risultati per il ticker.",
          symbol,
          normalized_symbol: normalizedSymbol,
          source_id: "yahoo_chart",
          provider_response: raw,
          fetched_at: fetchedAt
        }
      };
    }

    const timestamps = chartResult.timestamp || [];
    const quote = chartResult.indicators?.quote?.[0] || {};
    const adjClose = chartResult.indicators?.adjclose?.[0]?.adjclose || [];

    const records = timestamps
      .map((timestamp, index) => {
        const date = new Date(timestamp * 1000).toISOString().slice(0, 10);

        const open = normalizeNumber(quote.open?.[index]);
        const high = normalizeNumber(quote.high?.[index]);
        const low = normalizeNumber(quote.low?.[index]);
        const close = normalizeNumber(quote.close?.[index]);
        const volume = normalizeInteger(quote.volume?.[index]);
        const adjustedClose = normalizeNumber(adjClose?.[index]);

        return {
          ticker: String(symbol).trim().toUpperCase(),
          symbol: String(symbol).trim().toUpperCase(),
          date,
          open,
          high,
          low,
          close,
          adjusted_close: adjustedClose,
          volume,
          source_id: "yahoo_chart",
          fetched_at: fetchedAt,
          data_as_of: date,
          completeness_score: calculateRowCompleteness({
            open,
            high,
            low,
            close,
            volume
          })
        };
      })
      .filter((record) => {
        return record.date && record.close !== null;
      });

    const latestRecordDate = records.length
      ? records[records.length - 1].date
      : null;

    return {
      ok: true,
      status: 200,
      payload: {
        data: {
          symbol: String(symbol).trim().toUpperCase(),
          provider_symbol: normalizedSymbol,
          records_count: records.length,
          latest_record_date: latestRecordDate,
          records
        },
        data_quality: {
          source_id: "yahoo_chart",
          fetched_at: fetchedAt,
          data_as_of: latestRecordDate,
          average_completeness_score: calculateAverageCompleteness(records)
        },
        disclaimer:
          "Dati storici descrittivi da provider chart pubblico. Uso educativo, nessuna consulenza finanziaria."
      }
    };
  } catch (error) {
    return {
      ok: false,
      status: 500,
      payload: {
        error: "YAHOO_HISTORY_FETCH_FAILED",
        message: error.message,
        symbol,
        normalized_symbol: normalizedSymbol,
        source_id: "yahoo_chart",
        fetched_at: fetchedAt
      }
    };
  }
}

function normalizeYahooSymbol(symbol) {
  if (!symbol) {
    return null;
  }

  const value = String(symbol).trim().toUpperCase();

  if (!isSupportedDailyHistoryTicker(value)) {
    return null;
  }

  return value;
}

function isSupportedDailyHistoryTicker(symbol) {
  const value = String(symbol || "").trim().toUpperCase();

  if (!value) return false;
  if (value.includes(" ")) return false;
  if (value.includes(".")) return false;
  if (value.includes("$")) return false;
  if (value.includes("^")) return false;
  if (value.includes("/")) return false;
  if (value.length > 8) return false;

  if (value.endsWith("W")) return false;
  if (value.endsWith("WS")) return false;
  if (value.endsWith("WT")) return false;
  if (value.endsWith("U")) return false;
  if (value.endsWith("R")) return false;

  return /^[A-Z][A-Z0-9-]*$/.test(value);
}

function startOfDate(value) {
  const date = value ? new Date(`${value}T00:00:00Z`) : new Date();

  if (Number.isNaN(date.getTime())) {
    return new Date();
  }

  return date;
}

function addDays(date, days) {
  const nextDate = new Date(date);
  nextDate.setUTCDate(nextDate.getUTCDate() + days);
  return nextDate;
}

function toUnixSeconds(date) {
  return Math.floor(date.getTime() / 1000);
}

function normalizeNumber(value) {
  if (value === null || value === undefined) {
    return null;
  }

  const numberValue = Number(value);

  if (Number.isNaN(numberValue)) {
    return null;
  }

  return Math.round(numberValue * 1000000) / 1000000;
}

function normalizeInteger(value) {
  if (value === null || value === undefined) {
    return null;
  }

  const numberValue = Number(value);

  if (Number.isNaN(numberValue)) {
    return null;
  }

  return Math.round(numberValue);
}

function calculateRowCompleteness(record) {
  const fields = ["open", "high", "low", "close", "volume"];
  const present = fields.filter((field) => {
    return record[field] !== null && record[field] !== undefined;
  }).length;

  return Math.round((present / fields.length) * 100);
}

function calculateAverageCompleteness(records) {
  if (!records.length) {
    return 0;
  }

  const total = records.reduce((sum, record) => {
    return sum + Number(record.completeness_score || 0);
  }, 0);

  return Math.round(total / records.length);
}
