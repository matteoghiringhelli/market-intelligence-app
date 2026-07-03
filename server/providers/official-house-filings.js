import JSZip from "jszip";
import { XMLParser } from "fast-xml-parser";

const HOUSE_FINANCIAL_DISCLOSURE_URL =
  "https://disclosures-clerk.house.gov/FinancialDisclosure";

const HOUSE_BASE_URL = "https://disclosures-clerk.house.gov";

export async function fetchOfficialHouseFilingIndex({
  year = new Date().getFullYear(),
  filingType = "P",
  zipUrl = null
} = {}) {
  const fetchedAt = new Date().toISOString();

  try {
    const resolvedZipUrl =
      zipUrl ||
      process.env[`HOUSE_DISCLOSURE_ZIP_URL_${year}`] ||
      null;

    let finalZipUrl = resolvedZipUrl;

    if (!finalZipUrl) {
      const indexPageResponse = await fetch(HOUSE_FINANCIAL_DISCLOSURE_URL);

      if (!indexPageResponse.ok) {
        return {
          ok: false,
          status: indexPageResponse.status,
          payload: {
            error: "HOUSE_OFFICIAL_INDEX_PAGE_HTTP_ERROR",
            message:
              "Errore HTTP durante il recupero della pagina House Financial Disclosure.",
            status: indexPageResponse.status,
            source_id: "house_official_financial_disclosure",
            fetched_at: fetchedAt
          }
        };
      }

      const html = await indexPageResponse.text();
      finalZipUrl = discoverHouseZipUrl(html, year);
    }

    if (!finalZipUrl) {
      return {
        ok: false,
        status: 404,
        payload: {
          error: "HOUSE_OFFICIAL_ZIP_NOT_FOUND",
          message:
            "Non è stato possibile individuare automaticamente il link ZIP annuale nella pagina ufficiale House. Passa zipUrl come query param oppure configura HOUSE_DISCLOSURE_ZIP_URL_<YEAR> su Vercel.",
          source_id: "house_official_financial_disclosure",
          source_url: HOUSE_FINANCIAL_DISCLOSURE_URL,
          filing_year: year,
          fetched_at: fetchedAt,
          remediation: {
            query_param_example:
              "/api/market/congress-official-filings-db?chamber=house&year=2026&filingType=P&refresh=true&zipUrl=URL_DELLO_ZIP",
            env_var_example: `HOUSE_DISCLOSURE_ZIP_URL_${year}`
          }
        }
      };
    }

    const zipResponse = await fetch(finalZipUrl);

    if (!zipResponse.ok) {
      return {
        ok: false,
        status: zipResponse.status,
        payload: {
          error: "HOUSE_OFFICIAL_ZIP_HTTP_ERROR",
          message: "Errore HTTP durante il download dello ZIP ufficiale House.",
          status: zipResponse.status,
          source_id: "house_official_financial_disclosure",
          source_url: finalZipUrl,
          filing_year: year,
          fetched_at: fetchedAt
        }
      };
    }

    const zipBuffer = await zipResponse.arrayBuffer();
    const zip = await JSZip.loadAsync(zipBuffer);

    const fileNames = Object.keys(zip.files);
    const xmlFileName =
      fileNames.find((fileName) => fileName.toLowerCase().endsWith(".xml")) ||
      fileNames.find((fileName) => fileName.toLowerCase().endsWith(".txt"));

    if (!xmlFileName) {
      return {
        ok: false,
        status: 422,
        payload: {
          error: "HOUSE_OFFICIAL_INDEX_FILE_NOT_FOUND",
          message:
            "Lo ZIP ufficiale House non contiene un file XML/TXT individuabile.",
          source_id: "house_official_financial_disclosure",
          source_url: finalZipUrl,
          filing_year: year,
          available_files: fileNames,
          fetched_at: fetchedAt
        }
      };
    }

    const fileText = await zip.file(xmlFileName).async("text");
    const parsedRows = xmlFileName.toLowerCase().endsWith(".xml")
      ? parseXmlRows(fileText)
      : parseDelimitedRows(fileText);

    const filings = parsedRows
      .map((item) =>
        normalizeHouseFiling({
          item,
          year,
          sourceUrl: finalZipUrl,
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
        source_url: finalZipUrl,
        source_resolution: resolvedZipUrl ? "explicit_zip_url" : "auto_discovery",
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
  const hrefs = [];
  const hrefRegex = new RegExp("href=[\"']([^\"']+)[\"']", "gi");

  let match = hrefRegex.exec(html);

  while (match) {
    if (match[1]) {
      hrefs.push(match[1]);
    }

    match = hrefRegex.exec(html);
  }

  const zipHref = hrefs.find((href) => {
    const normalizedHref = String(href).toLowerCase();

    return (
      normalizedHref.includes(String(year)) &&
      normalizedHref.includes(".zip")
    );
  });

  if (!zipHref) {
    return null;
  }

  return normalizeHouseUrl(zipHref);
}

function normalizeHouseUrl(value) {
  const rawValue = String(value || "").trim();

  if (!rawValue) {
    return null;
  }

  if (rawValue.startsWith("http")) {
    return rawValue;
  }

  if (rawValue.startsWith("/")) {
    return `${HOUSE_BASE_URL}${rawValue}`;
  }

  return `${HOUSE_BASE_URL}/${rawValue}`;
}

function parseXmlRows(xmlText) {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "",
    trimValues: true
  });

  const parsedXml = parser.parse(xmlText);
  return collectLikelyRows(parsedXml);
}

function parseDelimitedRows(text) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return [];
  }

  const delimiter = lines[0].includes("\t") ? "\t" : ",";
  const headers = splitDelimitedLine(lines[0], delimiter);

  return lines.slice(1).map((line) => {
    const values = splitDelimitedLine(line, delimiter);
    const row = {};

    headers.forEach((header, index) => {
      row[header] = values[index] || null;
    });

    return row;
  });
}

function splitDelimitedLine(line, delimiter) {
  return String(line)
    .split(delimiter)
    .map((value) => value.trim().replace(/^"|"$/g, ""));
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

    const hasDocumentKey = lowerKeys.some((key) => {
      return key.includes("doc") || key.includes("document");
    });

    const hasFilerOrFilingKey = lowerKeys.some((key) => {
      return (
        key.includes("last") ||
        key.includes("first") ||
        key.includes("filing") ||
        key.includes("type")
      );
    });

    if (hasDocumentKey && hasFilerOrFilingKey) {
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
    filing_type: filingType ? String(filingType).trim().toUpperCase() : null,
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
    if (
      object[candidate] !== undefined &&
      object[candidate] !== null &&
      object[candidate] !== ""
    ) {
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
    return normalizeHouseUrl(rawDocumentUrl);
  }

  if (docId) {
    return `${HOUSE_BASE_URL}/public_disc/ptr-pdfs/${docId}.pdf`;
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
