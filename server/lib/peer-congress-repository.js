import { getSupabaseAdminClient } from "./supabase-admin.js";

export async function upsertPeerGroup({
  baseTicker,
  provider = "fmp",
  sourceId = "financial_modeling_prep",
  peers,
  rawPayload
}) {
  const supabase = getSupabaseAdminClient();
  const fetchedAt = new Date().toISOString();

  const { data: peerGroup, error: groupError } = await supabase
    .from("peer_groups")
    .upsert(
      {
        base_ticker: baseTicker,
        provider,
        source_id: sourceId,
        definition_type: "provider_peer_api",
        fetched_at: fetchedAt,
        data_as_of: fetchedAt.slice(0, 10),
        peers_count: peers.length,
        completeness_score: peers.length ? 100 : 0,
        raw_payload: rawPayload,
        updated_at: fetchedAt
      },
      {
        onConflict: "base_ticker,provider"
      }
    )
    .select("peer_group_id")
    .single();

  if (groupError) {
    throw new Error(`upsertPeerGroup failed: ${groupError.message}`);
  }

  const memberRows = peers.map((peerTicker) => ({
    peer_group_id: peerGroup.peer_group_id,
    base_ticker: baseTicker,
    peer_ticker: peerTicker,
    role: "peer",
    source_id: sourceId,
    fetched_at: fetchedAt
  }));

  if (memberRows.length) {
    const { error: membersError } = await supabase
      .from("peer_group_members")
      .upsert(memberRows, {
        onConflict: "base_ticker,peer_ticker,source_id"
      });

    if (membersError) {
      throw new Error(`upsertPeerGroup members failed: ${membersError.message}`);
    }
  }

  return {
    peer_group_id: peerGroup.peer_group_id,
    upserted_members: memberRows.length,
    fetched_at: fetchedAt
  };
}

export async function getPeerGroupFromDb(baseTicker) {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("serving_peer_groups")
    .select(
      "peer_group_id,base_ticker,provider,source_id,definition_type,fetched_at,data_as_of,peers_count,completeness_score,peers"
    )
    .eq("base_ticker", baseTicker)
    .maybeSingle();

  if (error) {
    throw new Error(`getPeerGroupFromDb failed: ${error.message}`);
  }

  return data || null;
}

export async function upsertCongressDisclosures(records) {
  const supabase = getSupabaseAdminClient();

  if (!records.length) {
    return {
      upserted: 0
    };
  }

  const now = new Date().toISOString();

  const rows = records.map((record) => ({
    chamber: record.chamber || null,
    member_name: record.member_name || null,
    ticker: record.ticker || null,
    asset_description: record.asset_description || null,
    transaction_type: record.transaction_type || null,
    amount: record.amount || null,
    transaction_date: normalizeDate(record.transaction_date),
    disclosure_date: normalizeDate(record.disclosure_date),
    reporting_delay_days: record.reporting_delay_days ?? null,
    owner: record.owner || null,
    raw_reference_url: record.raw_reference_url || null,
    source_id: record.source_id || "financial_modeling_prep",
    fetched_at: record.fetched_at || now,
    raw_payload: record,
    updated_at: now
  }));

  const { error } = await supabase
    .from("congress_disclosures")
    .upsert(rows, {
      onConflict:
        "chamber,member_name,ticker,asset_description,transaction_type,amount,transaction_date,disclosure_date,source_id"
    });

  if (error) {
    throw new Error(`upsertCongressDisclosures failed: ${error.message}`);
  }

  return {
    upserted: rows.length
  };
}

export async function getCongressDisclosuresFromDb({
  symbol,
  chamber = "both",
  limit = 50
}) {
  const supabase = getSupabaseAdminClient();

  let query = supabase
    .from("congress_disclosures")
    .select(
      "chamber,member_name,ticker,asset_description,transaction_type,amount,transaction_date,disclosure_date,reporting_delay_days,owner,raw_reference_url,source_id,fetched_at"
    )
    .order("disclosure_date", {
      ascending: false,
      nullsFirst: false
    })
    .limit(limit);

  if (symbol) {
    query = query.eq("ticker", symbol);
  }

  if (chamber !== "both") {
    const normalizedChamber = chamber === "house" ? "House" : "Senate";
    query = query.eq("chamber", normalizedChamber);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`getCongressDisclosuresFromDb failed: ${error.message}`);
  }

  return data || [];
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
