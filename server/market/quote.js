import { fetchFmpQuote } from "../providers/fmp.js";
import { fetchAlphaVantageQuote } from "../providers/alpha-vantage.js";

const CACHE_TTL_MS = 15 * 60 * 1000;

globalThis.marketQuoteCache = globalThis.marketQuoteCache || new Map();

export default async function handler(req, res) {
  const symbol = String(req.query.symbol || "AAPL").trim().toUpperCase();
  const provider = String(req.query.provider || "fmp").trim().toLowerCase();

  if (!symbol) {
    return res.status(400).json({
      error: "MISSING_SYMBOL",
      message: "Parametro symbol mancante. Esempio: /api/market/quote?symbol=AAPL&provider=fmp",
      fetched_at: new Date().toISOString()
    });
  }

  if (!["fmp", "alpha"].includes(provider)) {
    return res.status(400).json({
      error: "UNSUPPORTED_PROVIDER",
      message: "Provider non supportato. Usa provider=fmp oppure provider=alpha.",
      supported_providers: ["fmp", "alpha"],
      fetched_at: new Date().toISOString()
    });
  }

  const cacheKey = `${provider}:${symbol}`;
  const cachedPayload = getCachedQuote(cacheKey);

  if (cachedPayload) {
    return res.status(200).json({
      ...cachedPayload,
      cache: {
        status: "hit",
        ttl_minutes: 15,
        provider,
        symbol
      }
    });
  }

  const result =
    provider === "alpha"
      ? await fetchAlphaVantageQuote(symbol)
      : await fetchFmpQuote(symbol);

  if (!result.ok) {
    return res.status(result.status).json({
      ...result.payload,
      cache: {
        status: "skip",
        provider,
        symbol
      }
    });
  }

  const payload = {
    ...result.payload,
    provider,
    cache: {
      status: "miss",
      ttl_minutes: 15,
      provider,
      symbol
    }
  };

  setCachedQuote(cacheKey, payload);

  return res.status(200).json(payload);
}

function getCachedQuote(cacheKey) {
  const cacheItem = globalThis.marketQuoteCache.get(cacheKey);

  if (!cacheItem) {
    return null;
  }

  const ageMs = Date.now() - cacheItem.cachedAt;

  if (ageMs > CACHE_TTL_MS) {
    globalThis.marketQuoteCache.delete(cacheKey);
    return null;
  }

  return cacheItem.payload;
}

function setCachedQuote(cacheKey, payload) {
  globalThis.marketQuoteCache.set(cacheKey, {
    cachedAt: Date.now(),
    payload
  });
}