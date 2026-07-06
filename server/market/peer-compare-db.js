import { fetchFmpPeers } from "../providers/fmp-peers.js";
import { getSupabaseAdminClient } from "../lib/supabase-admin.js";
import {
  getPeerGroupFromDb,
  upsertPeerGroup
} from "../lib/peer-congress-repository.js";
import { getFundamentalsForTickers } from "../lib/fundamentals-repository.js";

export default async function handler(req, res) {
  const symbol = String(req.query.symbol || "AAPL").trim().toUpperCase();
  const limit = parseLimit(req.query.limit);
  const refresh = String(req.query.refresh || "false") === "true";

  try {
    let peerGroup = refresh ? null : await getPeerGroupFromDb(symbol);
    let sourceMode = "supabase-cache";

    if (!peerGroup || !Array.isArray(peerGroup.peers) || !peerGroup.peers.length) {
      const peerResult = await fetchFmpPeers(symbol);

      if (!peerResult.ok) {
        return res.status(peerResult.status).json(peerResult.payload);
      }

      const fetchedPeers = peerResult.payload.data.peers.slice(0, limit);

      await upsertPeerGroup({
        baseTicker: symbol,
        provider: "fmp",
        sourceId: "financial_modeling_prep",
        peers: fetchedPeers,
        rawPayload: peerResult.payload
      });

      peerGroup = await getPeerGroupFromDb(symbol);
      sourceMode = "fmp-refresh";
    }

    const peers = (peerGroup?.peers || []).slice(0, limit);
    const tickers = [symbol, ...peers];

    const latestPrices = await loadLatestPrices(tickers);
    const historySummary = await loadHistorySummary(tickers);
    const fundamentals = await getFundamentalsForTickers(tickers);

    const basePrice = latestPrices.find((row) => row.ticker === symbol) || null;

    const rows = tickers.map((ticker) => {
      const price = latestPrices.find((row) => row.ticker === ticker) || null;
      const summary = historySummary.find((row) => row.ticker === ticker) || null;
      const fundamental = fundamentals.find((row) => row.ticker === ticker) || null;

      return {
        ticker,
        role: ticker === symbol ? "base" : "peer",
        latest_close: price?.close ?? null,
        latest_date: price?.date ?? null,
        source_id:
          price?.source_id ||
          summary?.source_id ||
          peerGroup?.source_id ||
          "financial_modeling_prep",
        records_count: summary?.records_count || 0,
        first_date: summary?.first_date || null,
        latest_history_date: summary?.latest_date || null,
        average_completeness_score:
          summary?.average_completeness_score || null,
        relative_close_vs_base:
          basePrice?.close && price?.close
            ? roundNumber(
                ((Number(price.close) - Number(basePrice.close)) /
                  Number(basePrice.close)) *
                  100
              )
            : null,
        fundamentals: fundamental
          ? {
              market_cap: fundamental.market_cap,
              trailing_pe: fundamental.trailing_pe,
              forward_pe: fundamental.forward_pe,
              price_to_book: fundamental.price_to_book,
              profit_margin: fundamental.profit_margin,
              return_on_equity: fundamental.return_on_equity,
              debt_to_equity: fundamental.debt_to_equity,
              current_ratio: fundamental.current_ratio,
              revenue_growth: fundamental.revenue_growth,
              gross_margins: fundamental.gross_margins,
              completeness_score: fundamental.completeness_score,
              fetched_at: fundamental.fetched_at,
              source_id: fundamental.source_id
            }
          : null
      };
    });

    return res.status(200).json({
      data: {
        symbol,
        provider: "fmp",
        source: sourceMode,
        records_count: rows.length,
        peers_count: peers.length,
        peer_group_fetched_at: peerGroup?.fetched_at || null,
        rows
      },
      data_quality: {
        source_id: peerGroup?.source_id || "financial_modeling_prep",
        fetched_at: new Date().toISOString(),
        data_as_of: basePrice?.date || peerGroup?.data_as_of || null,
        completeness_score: calculateCompleteness(rows)
      },
      methodology:
        "Peer set persistito in Supabase da FMP Stock Peer Comparison API; prezzi/storico e fundamentals sintetici letti da Supabase serving/cache.",
      disclaimer:
        "Confronto peer descrittivo. Non implica ranking, raccomandazione o valutazione buy/sell."
    });
  } catch (error) {
    return res.status(500).json({
      error: "PEER_COMPARE_DB_FAILED",
      message: error.message,
      fetched_at: new Date().toISOString()
    });
  }
}

async function loadLatestPrices(tickers) {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("serving_latest_prices")
    .select("ticker,date,close,source_id,fetched_at,data_as_of,completeness_score")
    .in("ticker", tickers);

  if (error) {
    throw new Error(`loadLatestPrices failed: ${error.message}`);
  }

  return data || [];
}

async function loadHistorySummary(tickers) {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("serving_price_history_summary")
    .select(
      "ticker,source_id,first_date,latest_date,records_count,average_completeness_score,latest_fetched_at"
    )
    .in("ticker", tickers);

  if (error) {
    throw new Error(`loadHistorySummary failed: ${error.message}`);
  }

  return data || [];
}

function parseLimit(limitQuery) {
  const parsed = Number(limitQuery || 8);

  if (Number.isNaN(parsed) || parsed < 1) {
    return 8;
  }

  return Math.min(parsed, 20);
}

function roundNumber(value) {
  return Math.round(Number(value) * 100) / 100;
}

function calculateCompleteness(rows) {
  if (!rows.length) {
    return 0;
  }

  const completeRows = rows.filter((row) => {
    return row.latest_close !== null && row.latest_date && row.records_count > 0;
  });

  return Math.round((completeRows.length / rows.length) * 100);
}
