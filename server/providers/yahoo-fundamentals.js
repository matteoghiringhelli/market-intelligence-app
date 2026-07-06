const YAHOO_QUOTE_SUMMARY_BASE_URL =
  "https://query1.finance.yahoo.com/v10/finance/quoteSummary";

const MODULES = [
  "price",
  "summaryDetail",
  "defaultKeyStatistics",
  "financialData",
  "assetProfile"
];

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
    const url = new URL(
      `${YAHOO_QUOTE_SUMMARY_BASE_URL}/${encodeURIComponent(normalizedSymbol)}`
    );

    url.searchParams.set("modules", MODULES.join(","));

    const response = await fetch(url.toString(), {
      headers: {
        "User-Agent":
          "Mozilla/5.0 MarketIntelligenceApp/1.0 educational fundamentals retrieval"
      }
    });

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        payload: {
          error: "YAHOO_FUNDAMENTALS_HTTP_ERROR",
          message: "Errore HTTP da Yahoo Quote Summary.",
          status: response.status,
          symbol: normalizedSymbol,
          source_id: "yahoo_quote_summary",
          fetched_at: fetchedAt
        }
      };
    }

    const raw = await response.json();
    const result = raw?.quoteSummary?.result?.[0];

    if (!result) {
      return {
        ok: false,
        status: 502,
        payload: {
          error: "YAHOO_FUNDAMENTALS_EMPTY_RESULT",
          message: "Yahoo Quote Summary non ha restituito fundamentals.",
          symbol: normalizedSymbol,
          source_id: "yahoo_quote_summary",
          provider_response: raw,
          fetched_at: fetchedAt
        }
      };
    }

    const record = normalizeFundamentalRecord({
      symbol: normalizedSymbol,
      result,
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
          "Fondamentali sintetici da provider pubblico Yahoo Quote Summary. Uso descrittivo ed educativo, nessuna consulenza finanziaria."
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
  result,
  fetchedAt
}) {
  const price = result.price || {};
  const summaryDetail = result.summaryDetail || {};
  const keyStats = result.defaultKeyStatistics || {};
  const financialData = result.financialData || {};

  const record = {
    ticker: symbol,
    company_name:
      pickRaw(price.longName) ||
      pickRaw(price.shortName) ||
      null,
    market_cap: pickNumber(price.marketCap),
    trailing_pe: pickNumber(summaryDetail.trailingPE),
    forward_pe: pickNumber(summaryDetail.forwardPE),
    price_to_book: pickNumber(keyStats.priceToBook),
    profit_margin: pickNumber(financialData.profitMargins),
    return_on_equity: pickNumber(financialData.returnOnEquity),
    debt_to_equity: pickNumber(financialData.debtToEquity),
    current_ratio: pickNumber(financialData.currentRatio),
    revenue_growth: pickNumber(financialData.revenueGrowth),
    gross_margins: pickNumber(financialData.grossMargins),
    source_id: "yahoo_quote_summary",
    fetched_at: fetchedAt,
    data_as_of: fetchedAt.slice(0, 10),
    raw_payload: result
  };

  record.completeness_score = calculateCompleteness(record);

  return record;
}

function pickNumber(value) {
  if (value === null || value === undefined) {
    return null;
  }

  const rawValue =
    typeof value === "object" && value.raw !== undefined
      ? value.raw
      : value;

  const numberValue = Number(rawValue);

  if (Number.isNaN(numberValue)) {
    return null;
  }

  return Math.round(numberValue * 1000000) / 1000000;
}

function pickRaw(value) {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "object" && value.raw !== undefined) {
    return value.raw;
  }

  return value;
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
