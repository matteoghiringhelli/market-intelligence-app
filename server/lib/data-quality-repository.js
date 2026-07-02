import { getSupabaseAdminClient } from "./supabase-admin.js";

export async function getDataQualityOverview() {
  const supabase = getSupabaseAdminClient();

  const [
    priceSummaryResult,
    ingestionRunsResult,
    qualityLogResult,
    technicalPatternsResult
  ] = await Promise.all([
    loadPriceHistorySummary(supabase),
    loadLatestIngestionRuns(supabase),
    loadLatestDataQualityLogs(supabase),
    loadTechnicalPatternsSummary(supabase)
  ]);

  return {
    price_history_summary: priceSummaryResult,
    latest_ingestion_runs: ingestionRunsResult,
    latest_quality_logs: qualityLogResult,
    technical_patterns_summary: technicalPatternsResult,
    generated_at: new Date().toISOString()
  };
}

async function loadPriceHistorySummary(supabase) {
  const { data, error } = await supabase
    .from("serving_price_history_summary")
    .select(
      "ticker,source_id,first_date,latest_date,records_count,average_completeness_score,latest_fetched_at"
    )
    .order("ticker", {
      ascending: true
    });

  if (error) {
    return {
      ok: false,
      error: error.message,
      rows: []
    };
  }

  return {
    ok: true,
    rows: data || []
  };
}

async function loadLatestIngestionRuns(supabase) {
  const { data, error } = await supabase
    .from("ingestion_runs")
    .select(
      "ingestion_run_id,job_name,provider,status,started_at,finished_at,requested_symbols,successful_symbols,failed_symbols,notes"
    )
    .order("started_at", {
      ascending: false
    })
    .limit(10);

  if (error) {
    return {
      ok: false,
      error: error.message,
      rows: []
    };
  }

  return {
    ok: true,
    rows: data || []
  };
}

async function loadLatestDataQualityLogs(supabase) {
  const { data, error } = await supabase
    .from("data_quality_log")
    .select(
      "record_id,table_name,record_ref,field_name,source_id,freshness_ts,completeness_flag,reliability_tier,notes,created_at"
    )
    .order("created_at", {
      ascending: false
    })
    .limit(20);

  if (error) {
    return {
      ok: false,
      error: error.message,
      rows: []
    };
  }

  return {
    ok: true,
    rows: data || []
  };
}

async function loadTechnicalPatternsSummary(supabase) {
  const { data, error } = await supabase
    .from("technical_patterns")
    .select("ticker,pattern_name,timeframe,source_id,computed_at,window_end")
    .order("computed_at", {
      ascending: false
    })
    .limit(50);

  if (error) {
    return {
      ok: false,
      error: error.message,
      rows: []
    };
  }

  const rows = data || [];

  const summaryByTicker = rows.reduce((acc, row) => {
    if (!acc[row.ticker]) {
      acc[row.ticker] = {
        ticker: row.ticker,
        patterns_count: 0,
        latest_computed_at: row.computed_at,
        latest_window_end: row.window_end,
        source_id: row.source_id
      };
    }

    acc[row.ticker].patterns_count += 1;

    return acc;
  }, {});

  return {
    ok: true,
    rows,
    summary_by_ticker: Object.values(summaryByTicker)
  };
}