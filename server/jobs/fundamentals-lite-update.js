import { computeAndUpsertFundamentalsLite } from "../lib/fundamentals-repository.js";
import { getUniverseSymbols } from "../lib/market-universe-repository.js";

const DEFAULT_SYMBOLS = ["AAPL", "MSFT", "JPM", "NVDA", "AMZN"];

export default async function handler(req, res) {
  const authResult = verifyCronAuthorization(req);

  if (!authResult.authorized) {
    return res.status(401).json({
      error: "UNAUTHORIZED",
      message: authResult.message,
      fetched_at: new Date().toISOString()
    });
  }

  const startedAt = new Date().toISOString();
  const symbolResolution = await resolveRequestedSymbols(req);
  const symbols = symbolResolution.symbols;

  if (!symbols.length) {
    return res.status(400).json({
      error: "NO_SYMBOLS_TO_PROCESS",
      message:
        "Nessun ticker da processare. Se usi symbols=all, verifica che securities_universe sia popolata e che il batch contenga ticker equity semplici.",
      symbol_resolution: symbolResolution,
      fetched_at: new Date().toISOString()
    });
  }

  const results = [];

  try {
    for (const symbol of symbols) {
      try {
        const result = await computeAndUpsertFundamentalsLite(symbol);

        results.push({
          symbol,
          ok: Boolean(result.record),
          upserted: result.upserted,
          message: result.message
        });
      } catch (error) {
        results.push({
          symbol,
          ok: false,
          upserted: 0,
          error: "FUNDAMENTALS_LITE_COMPUTE_FAILED",
          message: error.message
        });
      }
    }

    const successfulSymbols = results.filter((item) => item.ok).length;
    const failedSymbols = results.filter((item) => !item.ok).length;

    return res.status(200).json({
      job: "fundamentals-lite-update",
      mode: "supabase-persistent",
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      symbol_resolution: symbolResolution,
      symbols,
      summary: {
        requested_symbols: symbols.length,
        successful_symbols: successfulSymbols,
        failed_symbols: failedSymbols,
        total_upserted: results.reduce((sum, item) => {
          return sum + Number(item.upserted || 0);
        }, 0)
      },
      results,
      disclaimer:
        "Fundamentals-lite derivati da price_history interno: metriche descrittive di prezzo, trend, volatilità e posizione nel range 52 settimane. Non sono fondamentali contabili e non costituiscono raccomandazione finanziaria."
    });
  } catch (error) {
    return res.status(500).json({
      error: "FUNDAMENTALS_LITE_UPDATE_FAILED",
      message: error.message,
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      symbol_resolution: symbolResolution
    });
  }
}

function verifyCronAuthorization(req) {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return {
      authorized: true,
      message:
        "CRON_SECRET non configurato. Endpoint accessibile. Configurare CRON_SECRET per proteggere il job."
    };
  }

  const authHeader = req.headers.authorization;
  const querySecret = req.query.secret ? String(req.query.secret) : null;

  const authorizedByHeader = authHeader === `Bearer ${cronSecret}`;
  const authorizedByQuery = querySecret === cronSecret;

  if (authorizedByHeader || authorizedByQuery) {
    return {
      authorized: true,
      message: "Authorized"
    };
  }

  return {
    authorized: false,
    message:
      "Richiesta non autorizzata. Usa Vercel Cron con CRON_SECRET oppure passa ?secret=CRON_SECRET per test manuale."
  };
}

async function resolveRequestedSymbols(req) {
  const symbolsQuery = req.query.symbols ? String(req.query.symbols).trim() : "";
  const offset = parseOffset(req.query.offset);
  const batchSize = parseBatchSize(req.query.batchSize);

  if (symbolsQuery.toLowerCase() === "all") {
    const universeRows = await getUniverseSymbols({
      limit: batchSize,
      offset
    });

    const symbols = universeRows
      .map((row) => String(row.ticker || "").trim().toUpperCase())
      .filter(Boolean)
      .filter(isSupportedFundamentalsLiteTicker);

    return {
      mode: "universe-batch",
      source: "securities_universe",
      offset,
      batch_size: batchSize,
      symbols
    };
  }

  return {
    mode: symbolsQuery ? "explicit-symbols" : "default-symbols",
    source: symbolsQuery ? "query" : "default",
    offset: null,
    batch_size: null,
    symbols: parseSymbols(symbolsQuery)
  };
}

function parseSymbols(symbolsQuery) {
  if (!symbolsQuery) {
    return DEFAULT_SYMBOLS;
  }

  return String(symbolsQuery)
    .split(",")
    .map((symbol) => symbol.trim().toUpperCase())
    .filter(Boolean)
    .filter(isSupportedFundamentalsLiteTicker);
}

function parseBatchSize(batchSizeQuery) {
  const parsedBatchSize = Number(batchSizeQuery || 25);

  if (Number.isNaN(parsedBatchSize) || parsedBatchSize < 1) {
    return 25;
  }

  return Math.min(parsedBatchSize, 100);
}

function parseOffset(offsetQuery) {
  const parsedOffset = Number(offsetQuery || 0);

  if (Number.isNaN(parsedOffset) || parsedOffset < 0) {
    return 0;
  }

  return Math.floor(parsedOffset);
}

function isSupportedFundamentalsLiteTicker(symbol) {
  const value = String(symbol || "").trim().toUpperCase();

  if (!value) return false;
  if (value.includes(" ")) return false;
  if (value.includes(".")) return false;
  if (value.includes("$")) return false;
  if (value.includes("^")) return false;
  if (value.includes("/")) return false;
  if (value.length > 8) return false;

  if (value.endsWith("W")) return false;
  if (value.endsWith("WS")) return false;
  if (value.endsWith("WT")) return false;
  if (value.endsWith("U")) return false;
  if (value.endsWith("R")) return false;

  return /^[A-Z][A-Z0-9-]*$/.test(value);
}
