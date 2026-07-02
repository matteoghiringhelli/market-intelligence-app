import { getSupabaseAdminClient } from "./supabase-admin.js";

export async function upsertTechnicalPatterns(patterns) {
  const supabase = getSupabaseAdminClient();

  if (!patterns.length) {
    return {
      upserted: 0
    };
  }

  const tickers = Array.from(new Set(patterns.map((pattern) => pattern.ticker)));

  const { data: securities, error: securitiesError } = await supabase
    .from("securities")
    .select("security_id,ticker")
    .in("ticker", tickers);

  if (securitiesError) {
    throw new Error(`load securities failed: ${securitiesError.message}`);
  }

  const securityIdByTicker = new Map(
    (securities || []).map((security) => [security.ticker, security.security_id])
  );

  const rows = patterns.map((pattern) => ({
    security_id: securityIdByTicker.get(pattern.ticker) || null,
    ticker: pattern.ticker,
    pattern_name: pattern.pattern_name,
    timeframe: pattern.timeframe,
    explanation: pattern.explanation,
    trigger_conditions_json: pattern.trigger_conditions_json,
    detected_at: pattern.detected_at,
    window_start: pattern.window_start,
    window_end: pattern.window_end,
    limitations_note: pattern.limitations_note,
    source_id: pattern.source_id || "financial_modeling_prep",
    computed_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }));

  const { error } = await supabase
    .from("technical_patterns")
    .upsert(rows, {
      onConflict: "ticker,pattern_name,timeframe,window_end,source_id"
    });

  if (error) {
    throw new Error(`upsertTechnicalPatterns failed: ${error.message}`);
  }

  return {
    upserted: rows.length
  };
}

export async function getTechnicalPatternsFromDb({
  symbol,
  limit = 20
}) {
  const supabase = getSupabaseAdminClient();

  let query = supabase
    .from("technical_patterns")
    .select(
      "pattern_id,ticker,pattern_name,timeframe,explanation,trigger_conditions_json,detected_at,window_start,window_end,limitations_note,source_id,computed_at"
    )
    .order("computed_at", {
      ascending: false
    })
    .limit(limit);

  if (symbol) {
    query = query.eq("ticker", symbol);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`getTechnicalPatternsFromDb failed: ${error.message}`);
  }

  return data || [];
}