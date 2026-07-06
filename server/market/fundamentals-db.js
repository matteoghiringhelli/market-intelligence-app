import { fetchYahooFundamentals } from "../providers/yahoo-fundamentals.js";
import {
  upsertFundamentalSnapshot,
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
    const fetchResults = [];

    if (refresh) {
      for (const symbol of symbols) {
        const result = await fetchYahooFundamentals(symbol);

        if (!result.ok) {
          fetchResults.push({
            symbol,
            ok: false,
            status: result.status,
            error: result.payload?.error || "UNKNOWN_ERROR",
            message: result.payload?.message || "Fundamentals fetch failed."
          });

          continue;
        }

        const record = result.payload?.data?.record;

        if (record) {
          await upsertFundamentalSnapshot(record);
        }

        fetchResults.push({
          symbol,
          ok: true,
          status: 200,
          completeness_score: record?.completeness_score || 0,
          message: "Fundamentals persisted to Supabase."
        });
      }
    }

    const records = await getFundamentalsForTickers(symbols);

    return res.status(200).json({
      data: {
        symbols,
        refresh,
        records_count: records.length,
        records,
        fetch_results: fetchResults
      },
      data_quality: {
        source_id: "yahoo_quote_summary",
        fetched_at: new Date().toISOString(),
        completeness_score: calculateAverageCompleteness(records)
      },
      disclaimer:
        "Fondamentali sintetici descrittivi. Metriche usate per confronto educativo tra peer; nessuna raccomandazione finanziaria."
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
