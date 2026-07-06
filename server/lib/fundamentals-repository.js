import { getSupabaseAdminClient } from "./supabase-admin.js";

export async function upsertFundamentalSnapshot(record) {
  const supabase = getSupabaseAdminClient();
  const now = new Date().toISOString();

  const row = {
    ticker: sanitizeText(record.ticker),
    company_name: sanitizeText(record.company_name, 500),
    market_cap: normalizeNumber(record.market_cap),
    trailing_pe: normalizeNumber(record.trailing_pe),
    forward_pe: normalizeNumber(record.forward_pe),
    price_to_book: normalizeNumber(record.price_to_book),
    profit_margin: normalizeNumber(record.profit_margin),
    return_on_equity: normalizeNumber(record.return_on_equity),
    debt_to_equity: normalizeNumber(record.debt_to_equity),
    current_ratio: normalizeNumber(record.current_ratio),
    revenue_growth: normalizeNumber(record.revenue_growth),
    gross_margins: normalizeNumber(record.gross_margins),
    source_id: sanitizeText(record.source_id || "yahoo_quote_summary"),
    fetched_at: record.fetched_at || now,
    data_as_of: record.data_as_of || now.slice(0, 10),
    completeness_score: normalizeNumber(record.completeness_score),
    raw_payload: sanitizeJson(record.raw_payload || record),
    updated_at: now
  };

  const { error } = await supabase
    .from("fundamental_snapshots")
    .upsert(row, {
      onConflict: "ticker"
    });

  if (error) {
    throw new Error(`upsertFundamentalSnapshot failed: ${error.message}`);
  }

  return {
    upserted: 1
  };
}

export async function getFundamentalsForTickers(tickers) {
  const supabase = getSupabaseAdminClient();

  const cleanTickers = Array.from(
    new Set(
      (tickers || [])
        .map((ticker) => String(ticker || "").trim().toUpperCase())
        .filter(Boolean)
    )
  );

  if (!cleanTickers.length) {
    return [];
  }

  const { data, error } = await supabase
    .from("serving_fundamental_snapshots")
    .select("*")
    .in("ticker", cleanTickers);

  if (error) {
    throw new Error(`getFundamentalsForTickers failed: ${error.message}`);
  }

  return data || [];
}

function normalizeNumber(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numberValue = Number(value);

  if (Number.isNaN(numberValue)) {
    return null;
  }

  return numberValue;
}

function sanitizeText(value, maxLength = 1000) {
  if (value === null || value === undefined) {
    return null;
  }

  const sanitized = String(value)
    .replace(/\u0000/g, "")
    .replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!sanitized) {
    return null;
  }

  return sanitized.slice(0, maxLength);
}

function sanitizeJson(value) {
  return JSON.parse(JSON.stringify(value || null));
}
