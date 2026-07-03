import { parseOfficialHousePtrPdf } from "../providers/official-house-pdf-transactions.js";
import {
  upsertCongressDisclosures,
  getCongressDisclosuresFromDb
} from "../lib/peer-congress-repository.js";

export default async function handler(req, res) {
  const docId = req.query.docId ? String(req.query.docId).trim() : null;
  const documentUrl = req.query.documentUrl
    ? String(req.query.documentUrl).trim()
    : null;
  const memberName = req.query.memberName
    ? String(req.query.memberName).trim()
    : null;
  const filingDate = req.query.filingDate
    ? String(req.query.filingDate).trim()
    : null;
  const filingYear = req.query.filingYear
    ? Number(req.query.filingYear)
    : inferYearFromDate(filingDate);
  const persist = String(req.query.persist || "true") === "true";
  const limit = parseLimit(req.query.limit);

  try {
    const result = await parseOfficialHousePtrPdf({
      documentUrl,
      docId,
      memberName,
      filingDate,
      filingYear
    });

    if (!result.ok) {
      return res.status(result.status).json(result.payload);
    }

    const records = result.payload?.data?.records || [];

    let persistence = {
      enabled: persist,
      upserted: 0
    };

    if (persist && records.length) {
      const upsertResult = await upsertCongressDisclosures(records);
      persistence = {
        enabled: true,
        upserted: upsertResult.upserted
      };
    }

    const cachedRecords = await getCongressDisclosuresFromDb({
      symbol: "",
      chamber: "house",
      limit
    });

    return res.status(200).json({
      ...result.payload,
      persistence,
      supabase_cache_preview: {
        records_count: cachedRecords.length,
        records: cachedRecords.slice(0, Math.min(limit, 20))
      }
    });
  } catch (error) {
    return res.status(500).json({
      error: "HOUSE_OFFICIAL_PDF_TRANSACTIONS_FAILED",
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


function inferYearFromDate(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.getUTCFullYear();
}
