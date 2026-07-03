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

    const successfulResults = results.filter((result) => result.ok);
    const failedResults = results.filter((result) => !result.ok);

    const trades = successfulResults
      .flatMap((result) => result.payload.data.records)
      .sort((a, b) => {
        const dateA = new Date(a.disclosure_date || a.transaction_date || 0);
        const dateB = new Date(b.disclosure_date || b.transaction_date || 0);

        return dateB - dateA;
      })
      .slice(0, limit);

    const allEndpointsFailed = failedResults.length === results.length;
    const allFailuresArePaymentRequired = failedResults.every((failure) => {
      return failure.status === 402;
    });

    if (!trades.length && allEndpointsFailed && allFailuresArePaymentRequired) {
      return {
        ok: false,
        status: 402,
        payload: {
          error: "FMP_CONGRESS_PREMIUM_REQUIRED",
          message:
            "Gli endpoint FMP Congress Disclosures risultano non disponibili con il piano/API key attuale.",
          explanation:
            "FMP ha risposto HTTP 402 su House/Senate trades. La pagina può restare educativa, ma questi dati non possono essere aggiornati via FMP con questa API key.",
          failures: failedResults.map((failure) => failure.payload),
          source_id: "financial_modeling_prep",
          fetched_at: new Date().toISOString()
        }
      };
    }

    if (!trades.length && allEndpointsFailed) {
      const firstFailure = failedResults[0];

      return {
        ok: false,
        status: firstFailure.status || 502,
        payload: {
          error: "FMP_CONGRESS_ALL_ENDPOINTS_FAILED",
          message:
            "Tutti gli endpoint Congress richiesti hanno restituito errore.",
          failures: failedResults.map((failure) => failure.payload),
          source_id: "financial_modeling_prep",
          fetched_at: new Date().toISOString()
        }
      };
    }

    return {
      ok: true,
      status: 200,
      payload: {
        data: {
          symbol: normalizedSymbol || null,
          chamber,
          records_count: trades.length,
          records: trades,
          partial_success: failedResults.length > 0,
          warnings: failedResults.map((failure) => ({
            endpoint: failure.payload?.endpoint || null,
            chamber: failure.payload?.chamber || null,
            status: failure.status || null,
            error: failure.payload?.error || null,
            message: failure.payload?.message || null,
            provider_response: failure.payload?.provider_response || null
          }))
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

  let providerPayload = null;

  try {
    const response = await fetch(url.toString());

    try {
      providerPayload = await response.json();
    } catch {
      providerPayload = null;
    }

    if (!response.ok) {
      const isPaymentRequired = response.status === 402;

      return {
        ok: false,
        status: response.status,
        payload: {
          error: isPaymentRequired
            ? "FMP_CONGRESS_PREMIUM_REQUIRED"
            : "FMP_CONGRESS_HTTP_ERROR",
          endpoint,
          chamber,
          message: isPaymentRequired
            ? `Endpoint FMP ${endpoint} non disponibile con il piano/API key attuale.`
            : `Errore HTTP da FMP ${endpoint}.`,
          status: response.status,
          source_id: sourceId,
          provider_response: providerPayload,
          fetched_at: new Date().toISOString()
        }
      };
    }

    const rows = Array.isArray(providerPayload)
      ? providerPayload
      : Array.isArray(providerPayload?.data)
        ? providerPayload.data
        : [];

    return {
      ok: true,
      status: 200,
      payload: {
        data: {
          endpoint,
          chamber,
          records: rows.map((row) =>
            normalizeCongressTrade(row, chamber, sourceId)
          )
        }
      }
    };
  } catch (error) {
    return {
      ok: false,
      status: 500,
      payload: {
        error: "FMP_CONGRESS_ENDPOINT_FETCH_FAILED",
        endpoint,
        chamber,
        message: error.message,
        source_id: sourceId,
        fetched_at: new Date().toISOString()
      }
    };
  }
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
