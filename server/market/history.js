import { fetchFmpHistoricalPrices } from "../providers/fmp-history.js";

export default async function handler(req, res) {
  const symbol = String(req.query.symbol || "AAPL").trim().toUpperCase();
  const provider = String(req.query.provider || "fmp").trim().toLowerCase();
  const from = req.query.from ? String(req.query.from) : null;
  const to = req.query.to ? String(req.query.to) : null;

  if (provider !== "fmp") {
    return res.status(400).json({
      error: "UNSUPPORTED_HISTORY_PROVIDER",
      message: "Per lo storico giornaliero, in questa fase è supportato provider=fmp.",
      supported_providers: ["fmp"],
      fetched_at: new Date().toISOString()
    });
  }

  const result = await fetchFmpHistoricalPrices({
    symbol,
    from,
    to,
    useCache: true
  });

  return res.status(result.status).json(result.payload);
}