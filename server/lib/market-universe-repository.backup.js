import { getSupabaseAdminClient } from "./supabase-admin.js";

export async function upsertSecuritiesUniverse(records) {
  const supabase = getSupabaseAdminClient();
  const now = new Date().toISOString();

  if (!records.length) {
    return { upserted: 0 };
  }

  const rows = records.map((record) => ({
    ticker: sanitizeText(record.ticker),
    company_name: sanitizeText(record.company_name, 500),
    exchange: sanitizeText(record.exchange),
    exchange_short_name: sanitizeText(record.exchange_short_name),
    security_type: sanitizeText(record.security_type),
    source_id: sanitizeText(record.source_id || "financial_modeling_prep"),
    fetched_at: record.fetched_at || now,
    raw_payload: sanitizeJson(record.raw_payload || record),
    is_active: true,
    updated_at: now
  }));

  const { error } = await supabase
    .from("securities_universe")
    .upsert(rows, {
      onConflict: "ticker"
    });

  if (error) {
    throw new Error(`upsertSecuritiesUniverse failed: ${error.message}`);
  }

  return { upserted: rows.length };
}

export async function getUniverseSymbols({
  limit = 500,
  offset = 0
} = {}) {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("securities_universe")
    .select("ticker,company_name,exchange_short_name")
    .in("exchange_short_name", ["NASDAQ", "NYSE"])
    .eq("is_active", true)
    .order("ticker", { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) {
    throw new Error(`getUniverseSymbols failed: ${error.message}`);
  }

  return data || [];
}

export async function searchUniverseSecurities({
  query,
  limit = 20
}) {
  const supabase = getSupabaseAdminClient();
  const cleanQuery = String(query || "").trim();

  if (!cleanQuery) {
    return [];
  }

  const { data, error } = await supabase
    .from("securities_universe")
    .select("ticker,company_name,exchange_short_name")
    .or(`ticker.ilike.%${cleanQuery}%,company_name.ilike.%${cleanQuery}%`)
    .in("exchange_short_name", ["NASDAQ", "NYSE"])
    .eq("is_active", true)
    .limit(limit);

  if (error) {
    throw new Error(`searchUniverseSecurities failed: ${error.message}`);
  }

  return data || [];
}

export async function recomputeBullishSignalScores({
  limit = 2000
} = {}) {
  const supabase = getSupabaseAdminClient();
  const now = new Date().toISOString();

  const { data: patterns, error: patternsError } = await supabase
    .from("technical_patterns")
    .select("ticker,pattern_name,timeframe,detected_at,computed_at,source_id")
    .order("computed_at", { ascending: false })
    .limit(limit);

  if (patternsError) {
    throw new Error(`load technical_patterns failed: ${patternsError.message}`);
  }

  const { data: universe, error: universeError } = await supabase
    .from("securities_universe")
    .select("ticker,company_name,exchange_short_name")
    .in("exchange_short_name", ["NASDAQ", "NYSE"]);

  if (universeError) {
    throw new Error(`load securities_universe failed: ${universeError.message}`);
  }

  const universeByTicker = new Map((universe || []).map((row) => [row.ticker, row]));
  const scoreByTicker = new Map();

  for (const pattern of patterns || []) {
    const ticker = pattern.ticker;
    const security = universeByTicker.get(ticker);

    if (!ticker || !security) {
      continue;
    }

    const patternScore = scorePattern(pattern);

    if (patternScore.score <= 0) {
      continue;
    }

    const current = scoreByTicker.get(ticker) || {
      ticker,
      company_name: security.company_name,
      exchange_short_name: security.exchange_short_name,
      bullish_score: 0,
      bullish_signal_count: 0,
      latest_pattern_name: null,
      latest_detected_at: null,
      latest_computed_at: null,
      reasons: []
    };

    current.bullish_score += patternScore.score;
    current.bullish_signal_count += 1;

    if (!current.latest_computed_at || new Date(pattern.computed_at || 0) > new Date(current.latest_computed_at || 0)) {
      current.latest_pattern_name = pattern.pattern_name || null;
      current.latest_detected_at = pattern.detected_at || null;
      current.latest_computed_at = pattern.computed_at || null;
    }

    current.reasons.push({
      pattern_name: pattern.pattern_name,
      timeframe: pattern.timeframe,
      detected_at: pattern.detected_at,
      computed_at: pattern.computed_at,
      theoretical_reading: patternScore.reason,
      score: patternScore.score
    });

    scoreByTicker.set(ticker, current);
  }

  const rows = Array.from(scoreByTicker.values()).map((row) => ({
    ticker: row.ticker,
    company_name: row.company_name,
    exchange_short_name: row.exchange_short_name,
    bullish_score: Math.round(row.bullish_score * 100) / 100,
    bullish_signal_count: row.bullish_signal_count,
    latest_pattern_name: row.latest_pattern_name,
    latest_detected_at: row.latest_detected_at,
    latest_computed_at: row.latest_computed_at,
    reasons: row.reasons,
    source_id: "market_signal_score_engine",
    computed_at: now,
    updated_at: now
  }));

  if (rows.length) {
    const { error: upsertError } = await supabase
      .from("market_signal_scores")
      .upsert(rows, {
        onConflict: "ticker"
      });

    if (upsertError) {
      throw new Error(`upsert market_signal_scores failed: ${upsertError.message}`);
    }
  }

  return {
    computed: rows.length,
    top: rows
      .sort((a, b) => b.bullish_score - a.bullish_score)
      .slice(0, 10)
  };
}

export async function getTopBullishSignals({
  limit = 10
} = {}) {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("serving_market_top_bullish")
    .select("*")
    .limit(limit);

  if (error) {
    throw new Error(`getTopBullishSignals failed: ${error.message}`);
  }

  return data || [];
}

function scorePattern(pattern) {
  const name = String(pattern.pattern_name || "").toLowerCase();

  if (name.includes("golden") || (name.includes("sma") && name.includes("bull"))) {
    return {
      score: 5,
      reason:
        "La teoria dell'analisi tecnica interpreta gli incroci rialzisti di medie mobili come possibile rafforzamento del momentum/trend."
    };
  }

  if (name.includes("sma") || name.includes("moving average")) {
    return {
      score: 3,
      reason:
        "La posizione favorevole di medie mobili brevi rispetto a medie più lunghe viene normalmente letta come momentum recente più forte."
    };
  }

  if (name.includes("rsi")) {
    if (name.includes("oversold") || name.includes("rebound")) {
      return {
        score: 2.5,
        reason:
          "RSI in recupero da aree deboli può essere letto teoricamente come miglioramento del momentum, ma richiede conferme."
      };
    }

    return {
      score: 1.5,
      reason:
        "RSI descrive momentum; letture favorevoli possono supportare un quadro tecnico positivo se coerenti col trend."
    };
  }

  if (name.includes("breakout")) {
    return {
      score: 4,
      reason:
        "Un breakout viene normalmente letto come superamento di un'area precedente di prezzo, ma è soggetto a falsi segnali."
    };
  }

  if (name.includes("volume")) {
    return {
      score: 1.5,
      reason:
        "Volume superiore alla media può rendere più significativo un movimento già osservato."
    };
  }

  return {
    score: 0,
    reason: null
  };
}

function sanitizeText(value, maxLength = 1000) {
  if (value === null || value === undefined) {
    return null;
  }

  return String(value)
    .replace(/\u0000/g, "")
    .replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function sanitizeJson(value) {
  return JSON.parse(JSON.stringify(value || null));
}
