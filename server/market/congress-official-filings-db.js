import { fetchOfficialHouseFilingIndex } from "../providers/official-house-filings.js";
import { getOfficialSenateDisclosureStatus } from "../providers/official-senate-filings.js";
import {
  getOfficialCongressFilingsFromDb,
  upsertOfficialCongressFilings
} from "../lib/congress-official-repository.js";

export default async function handler(req, res) {
  const chamber = String(req.query.chamber || "house").trim().toLowerCase();
  const year = parseYear(req.query.year);
  const filingType = req.query.filingType
    ? String(req.query.filingType).trim().toUpperCase()
    : "P";
  const limit = parseLimit(req.query.limit);
  const refresh = String(req.query.refresh || "false") === "true";
  const zipUrl = req.query.zipUrl ? String(req.query.zipUrl).trim() : null;

  try {
    if (chamber === "senate") {
      const senateStatus = getOfficialSenateDisclosureStatus();
      return res.status(200).json(senateStatus.payload);
    }

    if (chamber !== "house") {
      return res.status(400).json({
        error: "UNSUPPORTED_OFFICIAL_CHAMBER",
        message:
          "V1 supporta chamber=house. chamber=senate restituisce stato fonte ufficiale ma non parser automatico.",
        fetched_at: new Date().toISOString()
      });
    }

    let records = refresh
      ? []
      : await getOfficialCongressFilingsFromDb({
          chamber: "House",
          year,
          filingType,
          limit
        });

    let sourceMode = "supabase-cache";
    let refreshPayload = null;

    if (!records.length || refresh) {
      const result = await fetchOfficialHouseFilingIndex({
        year,
        filingType,
        zipUrl
      });

      if (!result.ok) {
        return res.status(result.status).json(result.payload);
      }

      const filings = result.payload?.data?.records || [];

      if (filings.length) {
        await upsertOfficialCongressFilings(filings);
      }

      records = await getOfficialCongressFilingsFromDb({
        chamber: "House",
        year,
        filingType,
        limit
      });

      sourceMode = "official-house-refresh";
      refreshPayload = result.payload;
    }

    return res.status(200).json({
      data: {
        chamber: "House",
        filing_year: year,
        filing_type: filingType,
        source: sourceMode,
        records_count: records.length,
        records
      },
      data_quality: {
        source_id: "house_official_financial_disclosure",
        fetched_at: new Date().toISOString(),
        data_as_of: String(year),
        completeness_score: calculateCompleteness(records)
      },
      refresh_metadata: refreshPayload
        ? {
            source_url: refreshPayload.source_url || null,
            source_resolution: refreshPayload.source_resolution || null,
            records_count: refreshPayload.data?.records_count || 0
          }
        : null,
      disclaimer:
        "V1 usa l'indice ufficiale House dei filing. Non estrae ancora le singole transazioni dai documenti/PDF."
    });
  } catch (error) {
    return res.status(500).json({
      error: "CONGRESS_OFFICIAL_FILINGS_FAILED",
      message: error.message,
      fetched_at: new Date().toISOString()
    });
  }
}

function parseYear(yearQuery) {
  const parsed = Number(yearQuery || new Date().getFullYear());

  if (Number.isNaN(parsed) || parsed < 2008) {
    return new Date().getFullYear();
  }

  return parsed;
}

function parseLimit(limitQuery) {
  const parsed = Number(limitQuery || 100);

  if (Number.isNaN(parsed) || parsed < 1) {
    return 100;
  }

  return Math.min(parsed, 500);
}

function calculateCompleteness(records) {
  if (!records.length) {
    return 0;
  }

  const completeRows = records.filter((record) => {
    return record.doc_id && record.filer_last_name && record.filing_type;
  });

  return Math.round((completeRows.length / records.length) * 100);
}
