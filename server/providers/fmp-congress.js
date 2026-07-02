export async function fetchFmpCongressTrades({
  symbol,
  chamber = "both",
  limit = 50
}) {
  const apiKey = process.env.FMP_API_KEY;
  const normalizedSymbol = symbol ? String(symbol).trim().toUpperCase() : "";

  if (!apiKey) {
    return {
      ok: false,
      status: 500,
      payload: {
        error: "MISSING_FMP_API_KEY",
        message: "La variabile FMP_API_KEY non è configurata.",
        source_id: "financial_modeling_prep",
        fetched_at: new Date().toISOString()
      }
    };
  }

  const requests = [];

  if (chamber === "both" || chamber === "house") {
    requests.push(
      fetchCongressEndpoint({
        endpoint: "house-trades",
        sourceId: "fmp_house_trades",
        chamber: "House",
        symbol: normalizedSymbol,
        apiKey
      })
    );
  }

  if (chamber === "both" || chamber === "senate") {
    requests.push(
      fetchCongressEndpoint({
        endpoint: "senate-trades",
        sourceId: "fmp_senate_trades",
        chamber: "Senate",
        symbol: normalizedSymbol,
        apiKey
      })
    );
  }

  try {
    const results = await Promise.all(requests);
    const failed = results.find((result) => !result.ok);

    if (failed) {
      return failed;
    }

    const trades = results
      .flatMap((result) => result.payload.data.records)
      .sort((a, b) => {
        const dateA = new Date(a.disclosure_date || a.transaction_date || 0);
        const dateB = new Date(b.disclosure_date || b.transaction_date || 0);

        return dateB - dateA;
      })
      .slice(0, limit);

    return {
      ok: true,
      status: 200,
      payload: {
        data: {
          symbol: normalizedSymbol || null,
          chamber,
          records_count: trades.length,
          records: trades
        },
        data_quality: {
          source_id: "financial_modeling_prep",
          fetched_at: new Date().toISOString(),
          data_as_of:
            trades[0]?.disclosure_date ||
            trades[0]?.transaction_date ||
            null,
          completeness_score: calculateCongressCompleteness(trades)
        },
        disclaimer:
          "Congress disclosures descrittive. Importi in range e possibili ritardi; nessuna inferenza su intenzioni o convenienza operativa."
      }
    };
  } catch (error) {
    return {
      ok: false,
      status: 500,
      payload: {
        error: "FMP_CONGRESS_FETCH_FAILED",
        message: error.message,
        source_id: "financial_modeling_prep",
        fetched_at: new Date().toISOString()
      }
    };
  }
}

async function fetchCongressEndpoint({
  endpoint,
  sourceId,
  chamber,
  symbol,
  apiKey
}) {
  const url = new URL(`https://financialmodelingprep.com/stable/${endpoint}`);

  if (symbol) {
    url.searchParams.set("symbol", symbol);
  }

  url.searchParams.set("apikey", apiKey);

  const response = await fetch(url.toString());

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      payload: {
        error: "FMP_CONGRESS_HTTP_ERROR",
        message: `Errore HTTP da FMP ${endpoint}.`,
        status: response.status,
        source_id: sourceId,
        fetched_at: new Date().toISOString()
      }
    };
  }

  const raw = await response.json();
  const rows = Array.isArray(raw)
    ? raw
    : Array.isArray(raw?.data)
      ? raw.data
      : [];

  return {
    ok: true,
    status: 200,
    payload: {
      data: {
        records: rows.map((row) => normalizeCongressTrade(row, chamber, sourceId))
      }
    }
  };
}

function normalizeCongressTrade(row, chamber, sourceId) {
  const ticker =
    row.symbol ||
    row.ticker ||
    row.stockSymbol ||
    row.assetTicker ||
    null;

  const memberName =
    row.representative ||
    row.senator ||
    row.name ||
    row.disclosureOwner ||
    row.owner ||
    null;

  const transactionDate =
    row.transactionDate ||
    row.transaction_date ||
    row.date ||
    null;

  const disclosureDate =
    row.disclosureDate ||
    row.disclosure_date ||
    row.filingDate ||
    row.filedDate ||
    null;

  return {
    chamber,
    member_name: memberName,
    ticker,
    asset_description:
      row.assetDescription ||
      row.asset_description ||
      row.asset ||
      row.companyName ||
      row.company ||
      null,
    transaction_type:
      row.transactionType ||
      row.transaction_type ||
      row.type ||
      null,
    amount:
      row.amount ||
      row.amountRange ||
      row.amount_range ||
      null,
    transaction_date: transactionDate,
    disclosure_date: disclosureDate,
    reporting_delay_days: calculateDelayDays(transactionDate, disclosureDate),
    owner:
      row.owner ||
      row.assetOwner ||
      row.disclosureOwner ||
      null,
    raw_reference_url:
      row.link ||
      row.url ||
      row.documentUrl ||
      null,
    source_id: sourceId,
    fetched_at: new Date().toISOString()
  };
}

function calculateDelayDays(transactionDate, disclosureDate) {
  if (!transactionDate || !disclosureDate) {
    return null;
  }

  const tx = new Date(transactionDate);
  const disc = new Date(disclosureDate);

  if (Number.isNaN(tx.getTime()) || Number.isNaN(disc.getTime())) {
    return null;
  }

  return Math.round((disc - tx) / (1000 * 60 * 60 * 24));
}

function calculateCongressCompleteness(records) {
  if (!records.length) {
    return 0;
  }

  const completeRows = records.filter((row) => {
    return row.member_name && row.asset_description && row.transaction_type;
  });

  return Math.round((completeRows.length / records.length) * 100);
}
