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
    let warnings = [];
    let availability = {
      status: records.length ? "available_from_supabase" : "not_checked",
      reason: null
    };

    if (!records.length || refresh) {
      const result = await fetchFmpCongressTrades({
        symbol,
        chamber,
        limit
      });

      if (!result.ok && result.status === 402) {
        return res.status(200).json({
          data: {
            symbol: symbol || null,
            chamber,
            source: "provider-unavailable",
            records_count: 0,
            records: [],
            warnings: result.payload?.failures || [],
            availability: {
              status: "provider_plan_required",
              reason:
                "FMP ha risposto HTTP 402 sugli endpoint Congress. Il dataset non è disponibile con il piano/API key attuale."
            }
          },
          data_quality: {
            source_id: "financial_modeling_prep",
            fetched_at: new Date().toISOString(),
            data_as_of: null,
            completeness_score: 0
          },
          disclaimer:
            "Congress disclosures non disponibili tramite FMP con il piano attuale. La sezione resta educativa; fonti ufficiali primarie: House Clerk e Senate Public Disclosure."
        });
      }

      if (!result.ok) {
        return res.status(result.status).json(result.payload);
      }

      const fetchedRecords = result.payload?.data?.records || [];
      warnings = result.payload?.data?.warnings || [];

      if (fetchedRecords.length) {
        await upsertCongressDisclosures(fetchedRecords);
      }

      records = await getCongressDisclosuresFromDb({
        symbol,
        chamber,
        limit
      });

      sourceMode = result.payload?.data?.partial_success
        ? "fmp-refresh-partial"
        : "fmp-refresh";

      availability = {
        status: records.length ? "available" : "empty_after_refresh",
        reason: records.length
          ? null
          : "Refresh completato ma nessun record disponibile per i filtri selezionati."
      };
    }

    return res.status(200).json({
      data: {
        symbol: symbol || null,
        chamber,
        source: sourceMode,
        records_count: records.length,
        records,
        warnings,
        availability
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
