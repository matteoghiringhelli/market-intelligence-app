import { fetchFmpHistoricalPrices } from "../providers/fmp-history.js";

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

  const symbols = parseSymbols(req.query.symbols);
  const days = parseDays(req.query.days);
  const { from, to } = buildDateWindow(days);

  const startedAt = new Date().toISOString();
  const results = [];

  for (const symbol of symbols) {
    const result = await fetchFmpHistoricalPrices({
      symbol,
      from,
      to,
      useCache: false
    });

    results.push({
      symbol,
      ok: result.ok,
      status: result.status,
      source_id: result.payload?.data_quality?.source_id || result.payload?.source_id || "financial_modeling_prep",
      records_count: result.payload?.data?.records_count || 0,
      latest_record_date: result.payload?.data?.latest_record_date || null,
      average_completeness_score:
        result.payload?.data_quality?.average_completeness_score || null,
      error: result.ok ? null : result.payload?.error || "UNKNOWN_ERROR",
      message: result.ok ? "Historical data refreshed in runtime cache." : result.payload?.message
    });
  }

  const finishedAt = new Date().toISOString();

  return res.status(200).json({
    job: "daily-history-update",
    mode: "runtime-cache-only",
    provider: "fmp",
    started_at: startedAt,
    finished_at: finishedAt,
    date_window: {
      from,
      to,
      days
    },
    symbols,
    summary: {
      requested_symbols: symbols.length,
      successful_symbols: results.filter((item) => item.ok).length,
      failed_symbols: results.filter((item) => !item.ok).length
    },
    results,
    persistence_note:
      "In questa fase cloud-only senza database, il job recupera e normalizza lo storico e aggiorna la cache runtime. Per conservare dati storici permanenti serve uno storage persistente, ad esempio Supabase/Postgres.",
    disclaimer:
      "Finalità esclusivamente informativa ed educativa. Dati storici descrittivi, nessuna consulenza finanziaria."
  });
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

function parseDays(daysQuery) {
  const parsedDays = Number(daysQuery || 10);

  if (Number.isNaN(parsedDays) || parsedDays < 1) {
    return 10;
  }

  return Math.min(parsedDays, 60);
}

function buildDateWindow(days) {
  const toDate = new Date();
  const fromDate = new Date();

  fromDate.setDate(toDate.getDate() - days);

  return {
    from: formatDate(fromDate),
    to: formatDate(toDate)
  };
}

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}