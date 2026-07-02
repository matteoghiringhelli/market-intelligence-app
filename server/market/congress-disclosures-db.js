import { fetchFmpCongressTrades } from "../providers/fmp-congress.js";

export default async function handler(req, res) {
  const symbol = req.query.symbol
    ? String(req.query.symbol).trim().toUpperCase()
    : "";

  const chamber = String(req.query.chamber || "both").trim().toLowerCase();
  const limit = parseLimit(req.query.limit);

  if (!["both", "house", "senate"].includes(chamber)) {
    return res.status(400).json({
      error: "UNSUPPORTED_CHAMBER",
      message: "Usa chamber=both, chamber=house oppure chamber=senate.",
      fetched_at: new Date().toISOString()
    });
  }

  const result = await fetchFmpCongressTrades({
    symbol,
    chamber,
    limit
  });

  return res.status(result.status).json(result.payload);
}

function parseLimit(limitQuery) {
  const parsed = Number(limitQuery || 50);

  if (Number.isNaN(parsed) || parsed < 1) {
    return 50;
  }

  return Math.min(parsed, 100);
}
