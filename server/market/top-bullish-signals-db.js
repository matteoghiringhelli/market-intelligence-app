import {
  recomputeBullishSignalScores,
  getTopBullishSignals
} from "../lib/market-universe-repository.js";

export default async function handler(req, res) {
  const refresh = String(req.query.refresh || "false") === "true";
  const limit = parseLimit(req.query.limit);

  try {
    let recompute = null;

    if (refresh) {
      recompute = await recomputeBullishSignalScores({
        limit: 5000
      });
    }

    const rows = await getTopBullishSignals({
      limit
    });

    return res.status(200).json({
      data: {
        records_count: rows.length,
        records: rows,
        recompute
      },
      data_quality: {
        source_id: "market_signal_score_engine",
        fetched_at: new Date().toISOString(),
        completeness_score: rows.length ? 100 : 0
      },
      disclaimer:
        "Bullish Study Score educativo: aggrega pattern tecnici normalmente interpretati come coerenti con momentum/trend rialzista. Non è una raccomandazione finanziaria."
    });
  } catch (error) {
    return res.status(500).json({
      error: "TOP_BULLISH_SIGNALS_FAILED",
      message: error.message,
      fetched_at: new Date().toISOString()
    });
  }
}

function parseLimit(value) {
  const parsed = Number(value || 10);

  if (Number.isNaN(parsed) || parsed < 1) {
    return 10;
  }

  return Math.min(parsed, 30);
}
