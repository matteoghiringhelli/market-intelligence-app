import { getSupabaseAdminClient } from "./supabase-admin.js";

export async function upsertTechnicalPatterns(patterns) {
  const supabase = getSupabaseAdminClient();

  if (!patterns.length) {
    return {
      upserted: 0
    };
  }

  const rows = patterns.map((pattern) => ({
    ticker: sanitizeText(pattern.ticker),
    pattern_name: sanitizeText(pattern.pattern_name, 300),
    timeframe: sanitizeText(pattern.timeframe || "Daily"),
    trigger_conditions_json: sanitizeJson({
      ...(pattern.trigger_conditions_json || {}),
      explanation: pattern.explanation || null,
      theoretical_reading: pattern.theoretical_reading || null,
      strength_score: pattern.strength_score || null
    }),
    detected_at: normalizeDate(pattern.detected_at),
    window_start: normalizeDate(pattern.window_start),
    window_end: normalizeDate(pattern.window_end),
    limitations_note: sanitizeText(pattern.limitations_note, 1000),
    source_id: sanitizeText(pattern.source_id || "technical_pattern_engine"),
    computed_at: pattern.computed_at || new Date().toISOString()
  }));

  const { error } = await supabase
    .from("technical_patterns")
    .upsert(rows, {
      onConflict: "ticker,pattern_name,timeframe,detected_at,source_id"
    });

  if (error) {
    throw new Error(`upsertTechnicalPatterns failed: ${error.message}`);
  }

  return {
    upserted: rows.length
  };
}

function normalizeDate(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString().slice(0, 10);
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
