import { fetchFmpCongressTrades } from "../providers/fmp-congress.js";
import {
  getCongressDisclosuresFromDb,
  upsertCongressDisclosures
} from "../lib/peer-congress-repository.js";

export default async function handler(req, res) {
  const symbol = req.query.symbol
    ? String(req.query.symbol).trim().toUpperCase()
    : "";

  const chamber = String(req.query.chamber || "both").trim().toLowerCase();
  const limit = parseLimit(req.query.limit);
  const refresh = String(req.query.refresh || "false") === "true";

  if (!["both", "house", "senate"].includes(chamber)) {
    return res.status(400).json({
      error: "UNSUPPORTED_CHAMBER",
      message: "Usa chamber=both, chamber=house oppure chamber=senate.",
      fetched_at: new Date().toISOString()
    });
  }

  try {
    let records = refresh
      ? []
      : await getCongressDisclosuresFromDb({
          symbol,
          chamber,
          limit
        });

    let sourceMode = "supabase-cache";

    if (!records.length) {
      const result = await fetchFmpCongressTrades({
        symbol,
        chamber,
        limit
      });

      if (!result.ok) {
        return res.status(result.status).json(result.payload);
      }

      const fetchedRecords = result.payload?.data?.records || [];
      await upsertCongressDisclosures(fetchedRecords);

      records = await getCongressDisclosuresFromDb({
        symbol,
        chamber,
        limit
      });

      sourceMode = "fmp-refresh";
    }

    return res.status(200).json({
      data: {
        symbol: symbol || null,
        chamber,
        source: sourceMode,
        records_count: records.length,
        records
      },
      data_quality: {
        source_id: records[0]?.source_id || "financial_modeling_prep",
        fetched_at: new Date().toISOString(),
        data_as_of:
          records[0]?.disclosure_date ||
          records[0]?.transaction_date ||
          null,
        completeness_score: calculateCongressCompleteness(records)
      },
      disclaimer:
        "Congress disclosures descrittive. Importi in range e possibili ritardi; nessuna inferenza su intenzioni o convenienza operativa."
    });
  } catch (error) {
    return res.status(500).json({
      error: "CONGRESS_DISCLOSURES_DB_FAILED",
      message: error.message,
      fetched_at: new Date().toISOString()
    });
  }
}

function parseLimit(limitQuery) {
  const parsed = Number(limitQuery || 50);

  if (Number.isNaN(parsed) || parsed < 1) {
    return 50;
  }

  return Math.min(parsed, 100);
}

function calculateCongressCompleteness(records) {
  if (!records.length) {
    return 0;
  }

  const completeRows = records.filter((row) => {
    return row.member_name && row.asset_description && row.transaction_type;
  });

  return Math.round((completeRows.length / records.length) * 100);
}
