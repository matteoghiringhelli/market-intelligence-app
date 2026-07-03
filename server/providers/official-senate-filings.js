export function getOfficialSenateDisclosureStatus() {
  return {
    ok: true,
    status: 200,
    payload: {
      data: {
        chamber: "Senate",
        source_id: "senate_public_disclosure",
        source_url: "https://www.disclosure.senate.gov/",
        parser_status: "not_implemented",
        records_count: 0,
        records: []
      },
      data_quality: {
        source_id: "senate_public_disclosure",
        fetched_at: new Date().toISOString(),
        data_as_of: null,
        completeness_score: 0
      },
      disclaimer:
        "Senate Public Disclosure è una fonte ufficiale pubblica. V1 non implementa scraping automatico del portale Senate perché non è stato identificato un endpoint bulk stabile e documentato in questa implementazione."
    }
  };
}
