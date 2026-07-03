import JSZip from "jszip";
import { XMLParser } from "fast-xml-parser";

const HOUSE_FINANCIAL_DISCLOSURE_URL =
  "https://disclosures-clerk.house.gov/FinancialDisclosure";

const HOUSE_BASE_URL = "https://disclosures-clerk.house.gov";

export async function fetchOfficialHouseFilingIndex({
  year = new Date().getFullYear(),
  filingType = "P"
} = {}) {
  const fetchedAt = new Date().toISOString();

  try {
    const indexPageResponse = await fetch(HOUSE_FINANCIAL_DISCLOSURE_URL);

    if (!indexPageResponse.ok) {
      return {
        ok: false,
        status: indexPageResponse.status,
        payload: {
          error: "HOUSE_OFFICIAL_INDEX_PAGE_HTTP_ERROR",
          message: "Errore HTTP durante il recupero della pagina House Financial Disclosure.",
          status: indexPageResponse.status,
          source_id: "house_official_financial_disclosure",
          fetched_at: fetchedAt
        }
      };
    }

    const html = await indexPageResponse.text();
    const zipUrl = discoverHouseZipUrl(html, year);

    if (!zipUrl) {
      return {
        ok: false,
        status: 404,
        payload: {
          error: "HOUSE_OFFICIAL_ZIP_NOT_FOUND",
          message:
            "Non è stato possibile individuare automaticamente il link ZIP annuale nella pagina ufficiale House.",
          source_id: "house_official_financial_disclosure",
          source_url: HOUSE_FINANCIAL_DISCLOSURE_URL,
          filing_year: year,
          fetched_at: fetchedAt
        }
      };
    }

    const zipResponse = await fetch(zipUrl);

    if (!zipResponse.ok) {
      return {
        ok: false,
        status: zipResponse.status,
        payload: {
          error: "HOUSE_OFFICIAL_ZIP_HTTP_ERROR",
          message: "Errore HTTP durante il download dello ZIP ufficiale House.",
          status: zipResponse.status,
          source_id: "house_official_financial_disclosure",
          source_url: zipUrl,
          filing_year: year,
          fetched_at: fetchedAt
        }
      };
    }

    const zipBuffer = await zipResponse.arrayBuffer();
    const zip = await JSZip.loadAsync(zipBuffer);

    const xmlFileName = Object.keys(zip.files).find((fileName) => {
      return fileName.toLowerCase().endsWith(".xml");
    });

    if (!xmlFileName) {
      return {
        ok: false,
        status: 422,
        payload: {
          error: "HOUSE_OFFICIAL_XML_NOT_FOUND",
          message: "Lo ZIP ufficiale House non contiene un file XML individuabile.",
          source_id: "house_official_financial_disclosure",
          source_url: zipUrl,
          filing_year: year,
          fetched_at: fetchedAt
        }
      };
    }

    const xmlText = await zip.file(xmlFileName).async("text");
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "",
      trimValues: true
    });

    const parsedXml = parser.parse(xmlText);
    const rawItems = collectLikelyRows(parsedXml);
    const filings = rawItems
      .map((item) =>
        normalizeHouseFiling({
          item,
          year,
          sourceUrl: zipUrl,
          fetchedAt
        })
      )
      .filter((filing) => filing.doc_id || filing.filer_last_name);

    const filteredFilings = filingType
      ? filings.filter((filing) => filing.filing_type === filingType)
      : filings;

    return {
      ok: true,
      status: 200,
      payload: {
        data: {
          chamber: "House",
          filing_year: year,
          filing_type: filingType,
          records_count: filteredFilings.length,
          records: filteredFilings
        },
        data_quality: {
          source_id: "house_official_financial_disclosure",
          fetched_at: fetchedAt,
          data_as_of: String(year),
          completeness_score: calculateCompleteness(filteredFilings)
        },
        source_url: zipUrl,
        disclaimer:
          "House official filing index. V1 indicizza i filing; l'estrazione delle singole transazioni richiede un parser documentale/PDF successivo."
      }
    };
  } catch (error) {
    return {
      ok: false,
      status: 500,
      payload: {
        error: "HOUSE_OFFICIAL_FETCH_FAILED",
        message: error.message,
        source_id: "house_official_financial_disclosure",
        fetched_at: fetchedAt
      }
    };
  }
}

function discoverHouseZipUrl(html, year) {
  const hrefs = Array.from(html.matchAll(/href=["']([^"']+)["']/gi)).map((match) => {
    return match[1];
  });

  const zipHref = hrefs.find((href) => {
    const normalizedHref = href.toLowerCase();
    return normalizedHref.includes(String(year)) && normalizedHref.includes(".zip");
  });

  if (!zipHref) {
    return null;
  }

  if (zipHref.startsWith("http")) {
    return zipHref;
  }

  if (zipHref.startsWith("/")) {
    return `${HOUSE_BASE_URL}${zipHref}`;
  }

  return `${HOUSE_BASE_URL}/${zipHref}`;
}

function collectLikelyRows(value) {
  const rows = [];

  function walk(node) {
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }

    if (!node || typeof node !== "object") {
      return;
    }

    const keys = Object.keys(node);
    const lowerKeys = keys.map((key) => key.toLowerCase());

    const looksLikeDisclosureRow =
      lowerKeys.some((key) => key.includes("doc")) &&
      (
        lowerKeys.some((key) => key.includes("last")) ||
        lowerKeys.some((key) => key.includes("filing")) ||
        lowerKeys.some((key) => key.includes("type"))
      );

    if (looksLikeDisclosureRow) {
      rows.push(node);
    }

    keys.forEach((key) => walk(node[key]));
  }

  walk(value);

  return rows;
}

function normalizeHouseFiling({
  item,
  year,
  sourceUrl,
  fetchedAt
}) {
  const docId =
    pickValue(item, ["DocID", "DocId", "doc_id", "DocumentID", "DocumentId"]) ||
    pickValue(item, ["Document", "DocumentId"]);

  const filingType =
    pickValue(item, ["FilingType", "Type", "filing_type"]) ||
    pickValue(item, ["ReportType"]);

  const firstName =
    pickValue(item, ["First", "FirstName", "filer_first_name", "First_Name"]);

  const lastName =
    pickValue(item, ["Last", "LastName", "filer_last_name", "Last_Name"]);

  const filingDate =
    pickValue(item, ["FilingDate", "Date", "Filing_Date", "filing_date"]);

  const rawDocumentUrl =
    pickValue(item, ["DocumentURL", "DocumentUrl", "URL", "Url", "Link"]);

  return {
    chamber: "House",
    filing_year: Number(year),
    filing_type: filingType || null,
    filing_type_label: mapHouseFilingType(filingType),
    doc_id: docId ? String(docId) : null,
    filer_prefix: pickValue(item, ["Prefix", "prefix"]) || null,
    filer_first_name: firstName || null,
    filer_last_name: lastName || null,
    filer_suffix: pickValue(item, ["Suffix", "suffix"]) || null,
    state: pickValue(item, ["State", "state"]) || null,
    district: pickValue(item, ["District", "district"]) || null,
    filing_date: filingDate || null,
    document_url: normalizeDocumentUrl(rawDocumentUrl, docId),
    source_id: "house_official_financial_disclosure",
    source_url: sourceUrl,
    fetched_at: fetchedAt,
    raw_payload: item
  };
}

function pickValue(object, candidates) {
  for (const candidate of candidates) {
    if (object[candidate] !== undefined && object[candidate] !== null && object[candidate] !== "") {
      return object[candidate];
    }
  }

  const lowerCandidateMap = new Map(
    Object.keys(object).map((key) => [key.toLowerCase(), key])
  );

  for (const candidate of candidates) {
    const actualKey = lowerCandidateMap.get(candidate.toLowerCase());

    if (
      actualKey &&
      object[actualKey] !== undefined &&
      object[actualKey] !== null &&
      object[actualKey] !== ""
    ) {
      return object[actualKey];
    }
  }

  return null;
}

function normalizeDocumentUrl(rawDocumentUrl, docId) {
  if (rawDocumentUrl) {
    if (String(rawDocumentUrl).startsWith("http")) {
      return rawDocumentUrl;
    }

    if (String(rawDocumentUrl).startsWith("/")) {
      return `${HOUSE_BASE_URL}${rawDocumentUrl}`;
    }

    return `${HOUSE_BASE_URL}/${rawDocumentUrl}`;
  }

  if (docId) {
    return SE_BASE_URL}/public_disc/ptr-pdfs/${docId}.pdf`;
  }

  return null;
}

function mapHouseFilingType(type) {
  const normalizedType = String(type || "").trim().toUpperCase();

  const labels = {
    P: "Periodic Transaction Report",
    A: "Annual",
    C: "Candidate",
    E: "Extension",
    T: "Termination",
    O: "Other",
    W: "Waiver"
  };

  return labels[normalizedType] || normalizedType || null;
}

function calculateCompleteness(filings) {
  if (!filings.length) {
    return 0;
  }

  const completeRows = filings.filter((filing) => {
    return filing.doc_id && filing.filer_last_name && filing.filing_type;
  });

  return Math.round((completeRows.length / filings.length) * 100);
}
