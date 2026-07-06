import { getSupabaseAdminClient } from "./supabase-admin.js";

export async function computeAndUpsertFundamentalsLite(symbol) {
  const supabase = getSupabaseAdminClient();
  const ticker = String(symbol || "").trim().toUpperCase();
  const now = new Date().toISOString();

  if (!ticker) {
    throw new Error("Missing ticker for fundamentals-lite computation.");
  }

  const { data: priceRows, error: priceError } = await supabase
    .from("price_history")
    .select("ticker,date,close,volume,source_id")
    .eq("ticker", ticker)
    .order("date", { ascending: false })
    .limit(260);

  if (priceError) {
    throw new Error(`load price_history failed: ${priceError.message}`);
  }

  if (!priceRows?.length) {
    return {
      upserted: 0,
      record: null,
      message: "No price history available for fundamentals-lite."
    };
  }

  const { data: universeRow } = await supabase
    .from("securities_universe")
    .select("ticker,company_name")
    .eq("ticker", ticker)
    .maybeSingle();

  const sortedRows = [...priceRows].sort((a, b) => {
    return new Date(a.date) - new Date(b.date);
  });

  const latest = sortedRows[sortedRows.length - 1];
  const first = sortedRows[0];

  const closes = sortedRows
    .map((row) => Number(row.close))
    .filter((value) => !Number.isNaN(value));

  const latestClose = normalizeNumber(latest?.close);
  const firstClose = normalizeNumber(first?.close);

  const high52w = closes.length ? Math.max(...closes) : null;
  const low52w = closes.length ? Math.min(...closes) : null;

  const return260d =
    latestClose !== null && firstClose
      ? roundNumber((latestClose - firstClose) / firstClose)
      : null;

  const volatility60d = calculateVolatility(
    sortedRows.slice(Math.max(0, sortedRows.length - 60))
  );

  const distanceFrom52wHigh =
    latestClose !== null && high52w
      ? roundNumber((latestClose - high52w) / high52w)
      : null;

  const distanceFrom52wLow =
    latestClose !== null && low52w
      ? roundNumber((latestClose - low52w) / low52w)
      : null;

  const pricePosition52w =
    latestClose !== null &&
    high52w !== null &&
    low52w !== null &&
    high52w !== low52w
      ? roundNumber((latestClose - low52w) / (high52w - low52w))
      : null;

  const record = {
    ticker,
    company_name: universeRow?.company_name || null,

    market_cap: null,
    trailing_pe: null,
    forward_pe: null,
    price_to_book: null,
    profit_margin: null,
    return_on_equity: null,
    debt_to_equity: null,
    current_ratio: null,
    revenue_growth: null,
    gross_margins: null,

    latest_close: latestClose,
    return_260d: return260d,
    volatility_60d: volatility60d,
    distance_from_52w_high: distanceFrom52wHigh,
    distance_from_52w_low: distanceFrom52wLow,
    price_position_52w: pricePosition52w,
    records_count: sortedRows.length,

    source_id: "internal_price_history_fundamentals_lite",
    fetched_at: now,
    data_as_of: latest?.date || now.slice(0, 10),
    completeness_score: calculateCompleteness({
      latest_close: latestClose,
      return_260d: return260d,
      volatility_60d: volatility60d,
      distance_from_52w_high: distanceFrom52wHigh,
      distance_from_52w_low: distanceFrom52wLow,
      price_position_52w: pricePosition52w,
      records_count: sortedRows.length
    }),
    raw_payload: {
      methodology:
        "Fundamentals-lite derived from internal price_history. Not accounting fundamentals.",
      first_date: first?.date || null,
      latest_date: latest?.date || null,
      high_52w: high52w,
      low_52w: low52w,
      price_source_id: latest?.source_id || null
    },
    updated_at: now
  };

  const { error: upsertError } = await supabase
    .from("fundamental_snapshots")
    .upsert(record, {
      onConflict: "ticker"
    });

  if (upsertError) {
    throw new Error(`upsertFundamentalSnapshot failed: ${upsertError.message}`);
  }

  return {
    upserted: 1,
    record,
    message: "Fundamentals-lite persisted to Supabase."
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

function calculateVolatility(rows) {
  if (!rows || rows.length < 2) {
    return null;
  }

  const returns = [];

  for (let index = 1; index < rows.length; index += 1) {
    const previousClose = Number(rows[index - 1]?.close);
    const currentClose = Number(rows[index]?.close);

    if (
      Number.isNaN(previousClose) ||
      Number.isNaN(currentClose) ||
      previousClose === 0
    ) {
      continue;
    }

    returns.push((currentClose - previousClose) / previousClose);
  }

  if (returns.length < 2) {
    return null;
  }

  const average =
    returns.reduce((sum, value) => sum + value, 0) / returns.length;

  const variance =
    returns.reduce((sum, value) => {
      return sum + Math.pow(value - average, 2);
    }, 0) /
    (returns.length - 1);

  return roundNumber(Math.sqrt(variance));
}

function calculateCompleteness(record) {
  const fields = [
    "latest_close",
    "return_260d",
    "volatility_60d",
    "distance_from_52w_high",
    "distance_from_52w_low",
    "price_position_52w",
    "records_count"
  ];

  const present = fields.filter((field) => {
    return record[field] !== null && record[field] !== undefined;
  }).length;

  return Math.round((present / fields.length) * 100);
}

function normalizeNumber(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numberValue = Number(value);

  if (Number.isNaN(numberValue)) {
    return null;
  }

  return roundNumber(numberValue);
}

function roundNumber(value) {
  return Math.round(Number(value) * 1000000) / 1000000;
}
