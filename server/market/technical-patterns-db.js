import { getTechnicalPatternsFromDb } from "../lib/technical-patterns-repository.js";

export default async function handler(req, res) {
  const symbol = req.query.symbol
    ? String(req.query.symbol).trim().toUpperCase()
    : null;

  const limit = parseLimit(req.query.limit);

  try {
    const patterns = await getTechnicalPatternsFromDb({
      symbol,
      limit
    });

    return res.status(200).json({
      data: {
        symbol,
        source: "supabase",
        records_count: patterns.length,
        patterns
      },
      data_quality: {
        fetched_at: new Date().toISOString(),
        source_id: patterns[0]?.source_id || null,
        data_as_of: patterns[0]?.window_end || null
      },
      disclaimer:
        "Pattern tecnici descrittivi. Nessuna consulenza finanziaria, nessun segnale operativo, nessuna raccomandazione buy/sell."
    });
  } catch (error) {
    return res.status(500).json({
      error: "TECHNICAL_PATTERNS_DB_FETCH_FAILED",
      message: error.message,
      fetched_at: new Date().toISOString()
    });
  }
}

function parseLimit(limitQuery) {
  const parsedLimit = Number(limitQuery || 20);

  if (Number.isNaN(parsedLimit) || parsedLimit < 1) {
    return 20;
  }

  return Math.min(parsedLimit, 100);
}