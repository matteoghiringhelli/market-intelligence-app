import {
  computeAndUpsertFundamentalsLite,
  getFundamentalsForTickers
} from "../lib/fundamentals-repository.js";

export default async function handler(req, res) {
  const symbols = parseSymbols(req.query.symbols || req.query.symbol);
  const refresh = String(req.query.refresh || "false") === "true";

  if (!symbols.length) {
    return res.status(400).json({
      error: "MISSING_FUNDAMENTAL_SYMBOLS",
      message: "Passa symbol=AAPL oppure symbols=AAPL,MSFT.",
      fetched_at: new Date().toISOString()
    });
  }

  try {
    const computeResults = [];

    if (refresh) {
      for (const symbol of symbols) {
        try {
          const result = await computeAndUpsertFundamentalsLite(symbol);

          computeResults.push({
            symbol,
            ok: Boolean(result.record),
            upserted: result.upserted,
            message: result.message
          });
        } catch (error) {
          computeResults.push({
            symbol,
            ok: false,
            upserted: 0,
            error: "FUNDAMENTALS_LITE_COMPUTE_FAILED",
            message: error.message
          });
        }
      }
    }

    const records = await getFundamentalsForTickers(symbols);

    return res.status(200).json({
      data: {
        symbols,
        refresh,
        records_count: records.length,
        records,
        compute_results: computeResults
      },
      data_quality: {
        source_id: "internal_price_history_fundamentals_lite",
        fetched_at: new Date().toISOString(),
        completeness_score: calculateAverageCompleteness(records)
      },
      disclaimer:
        "Fundamentals-lite derivati da price_history interno: metriche descrittive di prezzo, trend, volatilità e posizione nel range 52 settimane. Non sono fondamentali contabili e non costituiscono raccomandazione finanziaria."
    });
  } catch (error) {
    return res.status(500).json({
      error: "FUNDAMENTALS_DB_FAILED",
      message: error.message,
      fetched_at: new Date().toISOString()
    });
  }
}

function parseSymbols(value) {
  if (!value) {
    return [];
  }

  return String(value)
    .split(",")
    .map((symbol) => symbol.trim().toUpperCase())
    .filter(Boolean)
    .filter((symbol) => {
      return !symbol.includes("$") && !symbol.includes("/") && symbol.length <= 8;
    });
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
