import { getDataQualityOverview } from "../lib/data-quality-repository.js";

export default async function handler(req, res) {
  try {
    const overview = await getDataQualityOverview();

    return res.status(200).json({
      data: overview,
      data_quality: {
        source: "supabase",
        fetched_at: new Date().toISOString(),
        includes: [
          "serving_price_history_summary",
          "ingestion_runs",
          "data_quality_log",
          "technical_patterns"
        ]
      },
      disclaimer:
        "Finalità esclusivamente informativa ed educativa. Il Data Quality Panel descrive stato, freschezza e completezza dei dati, senza generare raccomandazioni finanziarie."
    });
  } catch (error) {
    return res.status(500).json({
      error: "DATA_QUALITY_DB_FETCH_FAILED",
      message: error.message,
      fetched_at: new Date().toISOString()
    });
  }
}