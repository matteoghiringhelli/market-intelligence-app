import { getHistoricalPricesFromDb } from "../lib/market-data-repository.js";
import { computeTechnicalPatternsFromPriceHistory } from "../lib/technical-pattern-engine.js";
import { upsertTechnicalPatterns } from "../lib/technical-patterns-repository.js";

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
  const symbols = parseSymbols(req.query.symbols);
  const limit = parseLimit(req.query.limit);

  const results = [];

  try {
    for (const symbol of symbols) {
      const priceRows = await getHistoricalPricesFromDb({
        symbol,
        limit
      });

      if (!priceRows.length) {
        results.push({
          symbol,
          ok: false,
          records_used: 0,
          patterns_detected: 0,
          upserted_patterns: 0,
          message:
            "Nessun dato storico trovato in Supabase. Esegui prima daily-history-update."
        });

        continue;
      }

      const patterns = computeTechnicalPatternsFromPriceHistory({
        ticker: symbol,
        records: priceRows
      });

      const upsertResult = await upsertTechnicalPatterns(patterns);

      results.push({
        symbol,
        ok: true,
        records_used: priceRows.length,
        patterns_detected: patterns.length,
        upserted_patterns: upsertResult.upserted,
        latest_price_date: priceRows[0]?.date || null,
        message:
          "Pattern tecnici descrittivi calcolati e salvati in Supabase."
      });
    }

    const successfulSymbols = results.filter((item) => item.ok).length;
    const failedSymbols = results.filter((item) => !item.ok).length;

    return res.status(200).json({
      job: "detect-technical-patterns",
      mode: "supabase-persistent",
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      symbols,
      limit,
      summary: {
        requested_symbols: symbols.length,
        successful_symbols: successfulSymbols,
        failed_symbols: failedSymbols,
        total_patterns_upserted: results.reduce((sum, item) => {
          return sum + Number(item.upserted_patterns || 0);
        }, 0)
      },
      results,
      disclaimer:
        "Pattern tecnici descrittivi. Nessuna consulenza finanziaria, nessun segnale operativo, nessuna raccomandazione buy/sell."
    });
  } catch (error) {
    return res.status(500).json({
      error: "DETECT_TECHNICAL_PATTERNS_FAILED",
      message: error.message,
      started_at: startedAt,
      finished_at: new Date().toISOString()
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

function parseSymbols(symbolsQuery) {
  if (!symbolsQuery) {
    return DEFAULT_SYMBOLS;
  }

  return String(symbolsQuery)
    .split(",")
    .map((symbol) => symbol.trim().toUpperCase())
    .filter(Boolean);
}

function parseLimit(limitQuery) {
  const parsedLimit = Number(limitQuery || 260);

  if (Number.isNaN(parsedLimit) || parsedLimit < 20) {
    return 260;
  }

  return Math.min(parsedLimit, 1000);
}