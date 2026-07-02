import crypto from "crypto";
import { getSupabaseAdminClient } from "./supabase-admin.js";

export async function createIngestionRun({
  jobName,
  provider,
  requestedSymbols
}) {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("ingestion_runs")
    .insert({
      job_name: jobName,
      provider,
      status: "running",
      requested_symbols: requestedSymbols
    })
    .select("ingestion_run_id")
    .single();

  if (error) {
    throw new Error(`createIngestionRun failed: ${error.message}`);
  }

  return data.ingestion_run_id;
}

export async function finishIngestionRun({
  ingestionRunId,
  status,
  successfulSymbols,
  failedSymbols,
  notes
}) {
  const supabase = getSupabaseAdminClient();

  const { error } = await supabase
    .from("ingestion_runs")
    .update({
      status,
      successful_symbols: successfulSymbols,
      failed_symbols: failedSymbols,
      notes,
      finished_at: new Date().toISOString()
    })
    .eq("ingestion_run_id", ingestionRunId);

  if (error) {
    throw new Error(`finishIngestionRun failed: ${error.message}`);
  }
}

export async function saveRawIngestionEvent({
  ingestionRunId,
  sourceId,
  ingestionType,
  externalRef,
  payload
}) {
  const supabase = getSupabaseAdminClient();
  const payloadString = JSON.stringify(payload);
  const payloadHash = crypto
    .createHash("sha256")
    .update(payloadString)
    .digest("hex");

  const { data, error } = await supabase
    .from("raw_ingestion_events")
    .insert({
      ingestion_run_id: ingestionRunId,
      source_id: sourceId,
      ingestion_type: ingestionType,
      external_ref: externalRef,
      payload,
      payload_hash: payloadHash,
      fetched_at: new Date().toISOString()
    })
    .select("raw_event_id")
    .single();

  if (error) {
    throw new Error(`saveRawIngestionEvent failed: ${error.message}`);
  }

  return data.raw_event_id;
}

export async function upsertSecuritiesFromHistoryRows(rows) {
  const supabase = getSupabaseAdminClient();

  const uniqueTickerMap = new Map();

  rows.forEach((row) => {
    const ticker = String(row.symbol || row.ticker || "").trim().toUpperCase();

    if (!ticker) {
      return;
    }

    if (!uniqueTickerMap.has(ticker)) {
      uniqueTickerMap.set(ticker, {
        ticker,
        updated_at: new Date().toISOString()
      });
    }
  });

  const securities = Array.from(uniqueTickerMap.values());

  if (!securities.length) {
    return {
      upserted: 0
    };
  }

  const { error } = await supabase
    .from("securities")
    .upsert(securities, {
      onConflict: "ticker"
    });

  if (error) {
    throw new Error(`upsertSecuritiesFromHistoryRows failed: ${error.message}`);
  }

  return {
    upserted: securities.length
  };
}

export async function upsertPriceHistoryRows(rows) {
  const supabase = getSupabaseAdminClient();

  if (!rows.length) {
    return {
      upserted: 0
    };
  }

  const tickers = Array.from(new Set(rows.map((row) => row.symbol)));

  const { data: securities, error: securitiesError } = await supabase
    .from("securities")
    .select("security_id,ticker")
    .in("ticker", tickers);

  if (securitiesError) {
    throw new Error(`load securities failed: ${securitiesError.message}`);
  }

  const securityIdByTicker = new Map(
    securities.map((security) => [security.ticker, security.security_id])
  );

  const priceRows = rows.map((row) => ({
    security_id: securityIdByTicker.get(row.symbol) || null,
    ticker: row.symbol,
    date: row.date,
    open: row.open,
    high: row.high,
    low: row.low,
    close: row.close,
    volume: row.volume,
    change: row.change,
    change_percent: row.changePercent,
    vwap: row.vwap,
    source_id: row.source_id,
    fetched_at: row.fetched_at,
    data_as_of: row.data_as_of,
    completeness_score: row.completeness_score,
    updated_at: new Date().toISOString()
  }));

  const { error } = await supabase
    .from("price_history")
    .upsert(priceRows, {
      onConflict: "ticker,date,source_id"
    });

  if (error) {
    throw new Error(`upsertPriceHistoryRows failed: ${error.message}`);
  }

  return {
    upserted: priceRows.length
  };
}

export async function insertDataQualityLog({
  tableName,
  recordRef,
  fieldName,
  sourceId,
  freshnessTs,
  completenessFlag,
  reliabilityTier,
  notes
}) {
  const supabase = getSupabaseAdminClient();

  const { error } = await supabase
    .from("data_quality_log")
    .insert({
      table_name: tableName,
      record_ref: recordRef,
      field_name: fieldName,
      source_id: sourceId,
      freshness_ts: freshnessTs,
      completeness_flag: completenessFlag,
      reliability_tier: reliabilityTier,
      notes
    });

  if (error) {
    throw new Error(`insertDataQualityLog failed: ${error.message}`);
  }
}

export async function getHistoricalPricesFromDb({ symbol, limit = 250 }) {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("price_history")
    .select(
      "ticker,date,open,high,low,close,volume,change,change_percent,vwap,source_id,fetched_at,data_as_of,completeness_score"
    )
    .eq("ticker", symbol)
    .order("date", {
      ascending: false
    })
    .limit(limit);

  if (error) {
    throw new Error(`getHistoricalPricesFromDb failed: ${error.message}`);
  }

  return data || [];
}