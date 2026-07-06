import { fetchFmpHistoricalPrices } from "../providers/fmp-history.js";
import {
  createIngestionRun,
  finishIngestionRun,
  saveRawIngestionEvent,
  upsertSecuritiesFromHistoryRows,
  upsertPriceHistoryRows,
  insertDataQualityLog
} from "../lib/market-data-repository.js";
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

  const symbolResolution = await resolveRequestedSymbols(req);
  const symbols = symbolResolution.symbols;
  const days = parseDays(req.query.days);
  const { from, to } = buildDateWindow(days);

  if (!symbols.length) {
    return res.status(400).json({
      error: "NO_SYMBOLS_TO_PROCESS",
      message:
        "Nessun ticker da processare. Se usi symbols=all, esegui prima il refresh dell'universo Nasdaq/NYSE.",
      symbol_resolution: symbolResolution,
      fetched_at: new Date().toISOString()
    });
  }

  const startedAt = new Date().toISOString();
  const results = [];

  let ingestionRunId = null;

  try {
    ingestionRunId = await createIngestionRun({
      jobName: "daily-history-update",
      provider: "fmp",
      requestedSymbols: symbols
    });

    for (const symbol of symbols) {
      const result = await fetchFmpHistoricalPrices({
        symbol,
        from,
        to,
        useCache: false
      });

      await saveRawIngestionEvent({
        ingestionRunId,
        sourceId: "financial_modeling_prep",
        ingestionType: "historical-price-eod",
        externalRef: symbol,
        payload: result.payload
      });

      if (!result.ok) {
        results.push({
          symbol,
          ok: false,
          status: result.status,
          records_count: 0,
          latest_record_date: null,
          average_completeness_score: null,
          error: result.payload?.error || "UNKNOWN_ERROR",
          message: result.payload?.message || "Historical fetch failed."
        });

        continue;
      }

      const records = result.payload?.data?.records || [];

      await upsertSecuritiesFromHistoryRows(records);
      const upsertResult = await upsertPriceHistoryRows(records);

      await insertDataQualityLog({
        tableName: "price_history",
        recordRef: symbol,
        fieldName: "historical_eod_batch",
        sourceId: "financial_modeling_prep",
        freshnessTs:
          result.payload?.data_quality?.fetched_at || new Date().toISOString(),
        completenessFlag:
          Number(result.payload?.data_quality?.average_completeness_score || 0) >= 80,
        reliabilityTier: "external_vendor",
        notes: `Daily historical update. Upserted ${upsertResult.upserted} rows.`
      });

      results.push({
        symbol,
        ok: true,
        status: result.status,
        source_id: "financial_modeling_prep",
        records_count: result.payload?.data?.records_count || 0,
        upserted_rows: upsertResult.upserted,
        latest_record_date: result.payload?.data?.latest_record_date || null,
        average_completeness_score:
          result.payload?.data_quality?.average_completeness_score || null,
        error: null,
        message: "Historical data persisted to Supabase."
      });
    }

    const successfulSymbols = results.filter((item) => item.ok).length;
    const failedSymbols = results.filter((item) => !item.ok).length;

    await finishIngestionRun({
      ingestionRunId,
      status: failedSymbols > 0 ? "completed_with_errors" : "completed",
      successfulSymbols,
      failedSymbols,
      notes: buildIngestionRunNotes(symbolResolution)
    });

    return res.status(200).json({
      job: "daily-history-update",
      mode: "supabase-persistent",
      provider: "fmp",
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      ingestion_run_id: ingestionRunId,
      symbol_resolution: symbolResolution,
      date_window: {
        from,
        to,
        days
      },
      symbols,
      summary: {
        requested_symbols: symbols.length,
        successful_symbols: successfulSymbols,
        failed_symbols: failedSymbols
      },
      results,
      disclaimer:
        "Finalità esclusivamente informativa ed educativa. Dati storici descrittivi, nessuna consulenza finanziaria."
    });
  } catch (error) {
    if (ingestionRunId) {
      await finishIngestionRun({
        ingestionRunId,
        status: "failed",
        successfulSymbols: results.filter((item) => item.ok).length,
        failedSymbols: results.filter((item) => !item.ok).length,
        notes: error.message
      });
    }

    return res.status(500).json({
      error: "DAILY_HISTORY_UPDATE_FAILED",
      message: error.message,
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      ingestion_run_id: ingestionRunId,
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
      .filter(Boolean);

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
    .filter(Boolean);
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

function parseDays(daysQuery) {
  const parsedDays = Number(daysQuery || 10);

  if (Number.isNaN(parsedDays) || parsedDays < 1) {
    return 10;
  }

  return Math.min(parsedDays, 260);
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

function buildIngestionRunNotes(symbolResolution) {
  if (symbolResolution.mode === "universe-batch") {
    return `Daily historical EOD update persisted to Supabase. Universe batch offset=${symbolResolution.offset}, batchSize=${symbolResolution.batch_size}.`;
  }

  return "Daily historical EOD update persisted to Supabase.";
}
