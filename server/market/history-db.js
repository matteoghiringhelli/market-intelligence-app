import { getHistoricalPricesFromDb } from "../lib/market-data-repository.js";

export default async function handler(req, res) {
  const symbol = String(req.query.symbol || "AAPL").trim().toUpperCase();
  const limit = parseLimit(req.query.limit);

  try {
    const rows = await getHistoricalPricesFromDb({
      symbol,
      limit
    });

    return res.status(200).json({
      data: {
        symbol,
        source: "supabase",
        records_count: rows.length,
        records: rows
      },
      data_quality: {
        source_id: rows[0]?.source_id || null,
        fetched_at: new Date().toISOString(),
        data_as_of: rows[0]?.date || null,
        average_completeness_score: calculateAverageCompleteness(rows)
      },
      disclaimer:
        "Finalità esclusivamente informativa ed educativa. Dati storici descrittivi, nessuna consulenza finanziaria."
    });
  } catch (error) {
    return res.status(500).json({
      error: "HISTORY_DB_FETCH_FAILED",
      message: error.message,
      fetched_at: new Date().toISOString()
    });
  }
}

function parseLimit(limitQuery) {
  const parsedLimit = Number(limitQuery || 250);

  if (Number.isNaN(parsedLimit) || parsedLimit < 1) {
    return 250;
  }

  return Math.min(parsedLimit, 1000);
}

function calculateAverageCompleteness(rows) {
  if (!rows.length) {
    return 0;
  }

  const total = rows.reduce((sum, row) => {
    return sum + Number(row.completeness_score || 0);
  }, 0);

  return Math.round(total / rows.length);
}