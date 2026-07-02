export async function fetchFmpPeers(symbol) {
  const apiKey = process.env.FMP_API_KEY;
  const normalizedSymbol = String(symbol || "").trim().toUpperCase();

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

  const url = new URL("https://financialmodelingprep.com/stable/stock-peers");
  url.searchParams.set("symbol", normalizedSymbol);
  url.searchParams.set("apikey", apiKey);

  try {
    const response = await fetch(url.toString());

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        payload: {
          error: "FMP_PEERS_HTTP_ERROR",
          message: "Errore HTTP da FMP Stock Peer Comparison API.",
          status: response.status,
          source_id: "financial_modeling_prep",
          fetched_at: new Date().toISOString()
        }
      };
    }

    const raw = await response.json();
    const peers = normalizePeers(raw, normalizedSymbol);

    return {
      ok: true,
      status: 200,
      payload: {
        data: {
          symbol: normalizedSymbol,
          peers,
          records_count: peers.length
        },
        data_quality: {
          source_id: "financial_modeling_prep",
          fetched_at: new Date().toISOString(),
          data_as_of: new Date().toISOString().slice(0, 10),
          completeness_score: peers.length ? 100 : 0
        },
        disclaimer:
          "Peer group reale da provider esterno. Lettura descrittiva, nessuna consulenza finanziaria."
      }
    };
  } catch (error) {
    return {
      ok: false,
      status: 500,
      payload: {
        error: "FMP_PEERS_FETCH_FAILED",
        message: error.message,
        source_id: "financial_modeling_prep",
        fetched_at: new Date().toISOString()
      }
    };
  }
}

function normalizePeers(raw, baseSymbol) {
  if (Array.isArray(raw)) {
    return raw
      .map((item) => {
        if (typeof item === "string") {
          return item.trim().toUpperCase();
        }

        return String(item.symbol || item.ticker || "").trim().toUpperCase();
      })
      .filter(Boolean)
      .filter((ticker) => ticker !== baseSymbol);
  }

  if (Array.isArray(raw?.peersList)) {
    return raw.peersList
      .map((ticker) => String(ticker).trim().toUpperCase())
      .filter(Boolean)
      .filter((ticker) => ticker !== baseSymbol);
  }

  if (Array.isArray(raw?.peers)) {
    return raw.peers
      .map((ticker) => String(ticker).trim().toUpperCase())
      .filter(Boolean)
      .filter((ticker) => ticker !== baseSymbol);
  }

  return [];
}
