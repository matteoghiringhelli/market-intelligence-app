const YAHOO_QUOTE_BASE_URL =
  "https://query1.finance.yahoo.com/v7/finance/quote";

export async function fetchYahooFundamentals(symbol) {
  const fetchedAt = new Date().toISOString();
  const normalizedSymbol = normalizeSymbol(symbol);

  if (!normalizedSymbol) {
    return {
      ok: false,
      status: 400,
      payload: {
        error: "INVALID_FUNDAMENTAL_SYMBOL",
        message: "Ticker non valido per fundamentals.",
        symbol,
        source_id: "yahoo_quote_summary",
        fetched_at: fetchedAt
      }
    };
  }

  try {
    const url = new URL(YAHOO_QUOTE_BASE_URL);
    url.searchParams.set("symbols", normalizedSymbol);

    const response = await fetch(url.toString(), {
      headers: {
        "User-Agent":
          "Mozilla/5.0 MarketIntelligenceApp/1.0 educational quote retrieval",
        "Accept": "application/json,text/plain,*/*"
      }
    });

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        payload: {
          error: "YAHOO_FUNDAMENTALS_HTTP_ERROR",
          message: "Errore HTTP da Yahoo Finance quote endpoint.",
          status: response.status,
          symbol: normalizedSymbol,
          source_id: "yahoo_quote_summary",
          fetched_at: fetchedAt
        }
      };
    }

    const raw = await response.json();
    const quote = raw?.quoteResponse?.result?.[0];

    if (!quote) {
      return {
        ok: false,
        status: 502,
        payload: {
          error: "YAHOO_FUNDAMENTALS_EMPTY_RESULT",
          message: "Yahoo Finance quote endpoint non ha restituito dati.",
          symbol: normalizedSymbol,
          source_id: "yahoo_quote_summary",
          provider_response: raw,
          fetched_at: fetchedAt
        }
      };
    }

    const record = normalizeFundamentalRecord({
      symbol: normalizedSymbol,
      quote,
      fetchedAt
    });

    return {
      ok: true,
      status: 200,
      payload: {
        data: {
          symbol: normalizedSymbol,
          record
        },
        data_quality: {
          source_id: "yahoo_quote_summary",
          fetched_at: fetchedAt,
          data_as_of: fetchedAt.slice(0, 10),
          completeness_score: record.completeness_score
        },
        disclaimer:
          "Fondamentali sintetici da Yahoo Finance quote endpoint. Uso descrittivo ed educativo, nessuna consulenza finanziaria."
      }
    };
  } catch (error) {
    return {
      ok: false,
      status: 500,
      payload: {
        error: "YAHOO_FUNDAMENTALS_FETCH_FAILED",
        message: error.message,
        symbol: normalizedSymbol,
        source_id: "yahoo_quote_summary",
        fetched_at: fetchedAt
      }
    };
  }
}

function normalizeFundamentalRecord({
  symbol,
  quote,
  fetchedAt
}) {
  const record = {
    ticker: symbol,
    company_name:
      quote.longName ||
      quote.shortName ||
      quote.displayName ||
      null,

    market_cap: normalizeNumber(quote.marketCap),
    trailing_pe: normalizeNumber(quote.trailingPE),
    forward_pe: normalizeNumber(quote.forwardPE),
    price_to_book: normalizeNumber(quote.priceToBook),

    profit_margin: null,
    return_on_equity: null,
    debt_to_equity: null,
    current_ratio: null,
    revenue_growth: null,
    gross_margins: null,

    source_id: "yahoo_quote_summary",
    fetched_at: fetchedAt,
    data_as_of: fetchedAt.slice(0, 10),
    raw_payload: quote
  };

  record.completeness_score = calculateCompleteness(record);

  return record;
}

function normalizeNumber(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numberValue = Number(value);

  if (Number.isNaN(numberValue)) {
    return null;
  }

  return Math.round(numberValue * 1000000) / 1000000;
}

function calculateCompleteness(record) {
  const fields = [
    "market_cap",
    "trailing_pe",
    "forward_pe",
    "price_to_book",
    "profit_margin",
    "return_on_equity",
    "debt_to_equity",
    "current_ratio",
    "revenue_growth",
    "gross_margins"
  ];

  const present = fields.filter((field) => {
    return record[field] !== null && record[field] !== undefined;
  }).length;

  return Math.round((present / fields.length) * 100);
}

function normalizeSymbol(symbol) {
  if (!symbol) {
    return null;
  }

  const value = String(symbol).trim().toUpperCase();

  if (!value) return null;
  if (value.includes(" ")) return null;
  if (value.includes("$")) return null;
  if (value.includes("/")) return null;
  if (value.length > 8) return null;

  return value;
}
