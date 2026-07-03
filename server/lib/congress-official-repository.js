import { getSupabaseAdminClient } from "./supabase-admin.js";

export async function upsertOfficialCongressFilings(filings) {
  const supabase = getSupabaseAdminClient();

  if (!filings.length) {
    return {
      upserted: 0
    };
  }

  const now = new Date().toISOString();

  const rows = filings.map((filing) => ({
    chamber: filing.chamber,
    filing_year: filing.filing_year,
    filing_type: filing.filing_type,
    filing_type_label: filing.filing_type_label,
    doc_id: filing.doc_id,
    filer_prefix: filing.filer_prefix,
    filer_first_name: filing.filer_first_name,
    filer_last_name: filing.filer_last_name,
    filer_suffix: filing.filer_suffix,
    state: filing.state,
    district: filing.district,
    filing_date: normalizeDate(filing.filing_date),
    document_url: filing.document_url,
    source_id: filing.source_id,
    source_url: filing.source_url,
    fetched_at: filing.fetched_at || now,
    raw_payload: filing.raw_payload || filing,
    updated_at: now
  }));

  const { error } = await supabase
    .from("congress_official_filings")
    .upsert(rows, {
      onConflict: "chamber,filing_year,doc_id,source_id"
    });

  if (error) {
    throw new Error(`upsertOfficialCongressFilings failed: ${error.message}`);
  }

  return {
    upserted: rows.length
  };
}

export async function getOfficialCongressFilingsFromDb({
  chamber = "House",
  year,
  filingType = null,
  limit = 100
}) {
  const supabase = getSupabaseAdminClient();

  let query = supabase
    .from("serving_congress_official_filings")
    .select(
      "chamber,filing_year,filing_type,filing_type_label,doc_id,filer_prefix,filer_first_name,filer_last_name,filer_suffix,state,district,filing_date,document_url,source_id,source_url,fetched_at,updated_at"
    )
    .eq("chamber", chamber)
    .order("filing_date", {
      ascending: false,
      nullsFirst: false
    })
    .limit(limit);

  if (year) {
    query = query.eq("filing_year", year);
  }

  if (filingType) {
    query = query.eq("filing_type", filingType);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`getOfficialCongressFilingsFromDb failed: ${error.message}`);
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
