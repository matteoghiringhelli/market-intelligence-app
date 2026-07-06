export async function fetchFmpStockUniverse() {
  const apiKey = process.env.FMP_API_KEY;
  const fetchedAt = new Date().toISOString();

  if (!apiKey) {
    return {
      ok: false,
      status: 500,
      payload: {
        error: "MISSING_FMP_API_KEY",
        message: "FMP_API_KEY non configurata.",
        source_id: "financial_modeling_prep",
        fetched_at: fetchedAt
      }
    };
  }

  const url = new URL("https://financialmodelingprep.com/stable/stock-list");
  url.searchParams.set("apikey", apiKey);

  try {
    const response = await fetch(url.toString());

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        payload: {
          error: "FMP_STOCK_LIST_HTTP_ERROR",
          message: "Errore HTTP da FMP stock-list.",
          status: response.status,
          source_id: "financial_modeling_prep",
          fetched_at: fetchedAt
        }
      };
    }

    const raw = await response.json();
    const rows = Array.isArray(raw) ? raw : [];

    const filteredRows = rows
      .map((item) => normalizeUniverseRow(item, fetchedAt))
      .filter((item) => {
        return (
          item.ticker &&
          ["NASDAQ", "NYSE"].includes(item.exchange_short_name) &&
          isLikelyCommonEquity(item)
        );
      });

    return {
      ok: true,
      status: 200,
      payload: {
        data: {
          records_count: filteredRows.length,
          records: filteredRows
        },
        data_quality: {
          source_id: "financial_modeling_prep",
          fetched_at: fetchedAt,
          completeness_score: filteredRows.length ? 100 : 0
        },
        disclaimer:
          "Universe Nasdaq/NYSE da FMP stock-list. Filtri V1: exchange NASDAQ/NYSE e tipo equity/common stock quando disponibile."
      }
    };
  } catch (error) {
    return {
      ok: false,
      status: 500,
      payload: {
        error: "FMP_STOCK_LIST_FETCH_FAILED",
        message: error.message,
        source_id: "financial_modeling_prep",
        fetched_at: fetchedAt
      }
    };
  }
}

function normalizeUniverseRow(item, fetchedAt) {
  const exchangeShortName =
    item.exchangeShortName ||
    item.exchange_short_name ||
    item.exchange ||
    null;

  return {
    ticker: cleanTicker(item.symbol || item.ticker),
    company_name: item.name || item.companyName || null,
    exchange: item.exchange || exchangeShortName || null,
    exchange_short_name: exchangeShortName
      ? String(exchangeShortName).trim().toUpperCase()
      : null,
    security_type: item.type || item.securityType || null,
    source_id: "financial_modeling_prep",
    fetched_at: fetchedAt,
    raw_payload: item
  };
}

function cleanTicker(value) {
  if (!value) {
    return null;
  }

  const ticker = String(value).trim().toUpperCase();

  if (!ticker || ticker.includes(" ") || ticker.length > 12) {
    return null;
  }

  return ticker;
}

function isLikelyCommonEquity(item) {
  const type = String(item.security_type || "").toLowerCase();

  if (!type) {
    return true;
  }

  if (type.includes("etf")) return false;
  if (type.includes("fund")) return false;
  if (type.includes("trust")) return false;
  if (type.includes("note")) return false;
  if (type.includes("warrant")) return false;
  if (type.includes("right")) return false;

  return true;
}
