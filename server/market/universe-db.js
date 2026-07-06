import { fetchFmpStockUniverse } from "../providers/fmp-universe.js";
import {
  upsertSecuritiesUniverse,
  getUniverseSymbols,
  searchUniverseSecurities
} from "../lib/market-universe-repository.js";

export default async function handler(req, res) {
  const action = String(req.query.action || "list").trim().toLowerCase();
  const query = req.query.query ? String(req.query.query).trim() : "";
  const limit = parseLimit(req.query.limit, 50, 500);
  const offset = parseOffset(req.query.offset);

  try {
    if (action === "refresh") {
      const result = await fetchFmpStockUniverse();

      if (!result.ok) {
        return res.status(result.status).json(result.payload);
      }

      const records = result.payload?.data?.records || [];
      const upsertResult = await upsertSecuritiesUniverse(records);

      return res.status(200).json({
        data: {
          action: "refresh",
          records_count: records.length,
          upserted: upsertResult.upserted
        },
        data_quality: result.payload.data_quality,
        disclaimer:
          "Universe Nasdaq/NYSE aggiornato da FMP stock-list. Uso istruttivo, non consulenziale."
      });
    }

    if (action === "search") {
      const rows = await searchUniverseSecurities({
        query,
        limit
      });

      return res.status(200).json({
        data: {
          action: "search",
          query,
          records_count: rows.length,
          records: rows
        },
        data_quality: {
          source_id: "securities_universe",
          fetched_at: new Date().toISOString()
        }
      });
    }

    const rows = await getUniverseSymbols({
      limit,
      offset
    });

    return res.status(200).json({
      data: {
        action: "list",
        records_count: rows.length,
        limit,
        offset,
        records: rows
      },
      data_quality: {
        source_id: "securities_universe",
        fetched_at: new Date().toISOString()
      }
    });
  } catch (error) {
    return res.status(500).json({
      error: "UNIVERSE_DB_FAILED",
      message: error.message,
      fetched_at: new Date().toISOString()
    });
  }
}

function parseLimit(value, defaultValue, maxValue) {
  const parsed = Number(value || defaultValue);

  if (Number.isNaN(parsed) || parsed < 1) {
    return defaultValue;
  }

  return Math.min(parsed, maxValue);
}

function parseOffset(value) {
  const parsed = Number(value || 0);

  if (Number.isNaN(parsed) || parsed < 0) {
    return 0;
  }

  return parsed;
}
