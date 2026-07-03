import { createRequire } from "module";

const require = createRequire(import.meta.url);
const PDFParser = require("pdf2json");

const HOUSE_BASE_URL = "https://disclosures-clerk.house.gov";

const TRANSACTION_TYPE_PATTERNS = [
  "purchase",
  "sale",
  "exchange",
  "sale_full",
  "sale_partial",
  "s",
  "p"
];

export async function parseOfficialHousePtrPdf({
  documentUrl,
  docId,
  memberName = null,
  filingDate = null,
  filingYear = null
}) {
  const fetchedAt = new Date().toISOString();
  const resolvedDocumentUrl = resolveHouseDocumentUrl({
    documentUrl,
    docId,
    filingYear,
    filingDate
  });

  if (!resolvedDocumentUrl) {
    return {
      ok: false,
      status: 400,
      payload: {
        error: "MISSING_HOUSE_DOCUMENT_URL",
        message: "Fornisci documentUrl oppure docId.",
        source_id: "house_official_ptr_pdf",
        fetched_at: fetchedAt
      }
    };
  }

  try {
    const response = await fetch(resolvedDocumentUrl);

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        payload: {
          error: "HOUSE_PTR_PDF_HTTP_ERROR",
          message: "Errore HTTP durante il download del PDF PTR House.",
          status: response.status,
          document_url: resolvedDocumentUrl,
          source_id: "house_official_ptr_pdf",
          fetched_at: fetchedAt
        }
      };
    }

    const pdfBuffer = Buffer.from(await response.arrayBuffer());
    const text = await extractTextWithPdf2Json(pdfBuffer);
    const normalizedText = normalizeText(text);

    const metadata = extractHousePtrMetadata({
      text: normalizedText,
      memberName,
      filingDate,
      docId,
      documentUrl: resolvedDocumentUrl,
      fetchedAt
    });

    const transactionCandidates = extractTransactionCandidates(normalizedText);

    const records = transactionCandidates.map((candidate) =>
      normalizeTransactionCandidate({
        candidate,
        metadata,
        fetchedAt,
        documentUrl: resolvedDocumentUrl
      })
    );

    const filteredRecords = records.filter((record) => {
      return (
        record.asset_description ||
        record.transaction_type ||
        record.amount ||
        record.transaction_date
      );
    });

    return {
      ok: true,
      status: 200,
      payload: {
        data: {
          chamber: "House",
          doc_id: docId || metadata.doc_id || null,
          document_url: resolvedDocumentUrl,
          member_name: metadata.member_name,
          filing_date: metadata.filing_date,
          extracted_text_length: normalizedText.length,
          records_count: filteredRecords.length,
          records: filteredRecords,
          parser_notes: buildParserNotes(filteredRecords, normalizedText)
        },
        data_quality: {
          source_id: "house_official_ptr_pdf",
          fetched_at: fetchedAt,
          data_as_of: metadata.filing_date || null,
          completeness_score: calculateCompleteness(filteredRecords)
        },
        disclaimer:
          "Parser euristico su PDF PTR House. I PDF possono avere layout variabile; le righe estratte richiedono controllo qualità. Nessuna inferenza su intenzioni o convenienza operativa."
      }
    };
  } catch (error) {
    return {
      ok: false,
      status: 500,
      payload: {
        error: "HOUSE_PTR_PDF_PARSE_FAILED",
        message: error.message,
        document_url: resolvedDocumentUrl,
        source_id: "house_official_ptr_pdf",
        fetched_at: fetchedAt
      }
    };
  }
}

function extractTextWithPdf2Json(pdfBuffer) {
  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser();

    pdfParser.on("pdfParser_dataError", (errorData) => {
      reject(new Error(errorData?.parserError || "Errore parsing PDF con pdf2json."));
    });

    pdfParser.on("pdfParser_dataReady", (pdfData) => {
      const pages = pdfData?.Pages || [];

      const text = pages
        .map((page) => {
          const texts = page.Texts || [];

          return texts
            .map((textItem) => {
              const runs = textItem.R || [];

              return runs
                .map((run) => {
                  try {
                    return decodeURIComponent(run.T || "");
                  } catch {
                    return run.T || "";
                  }
                })
                .join("");
            })
            .join(" ");
        })
        .join("\n");

      resolve(text);
    });

    pdfParser.parseBuffer(pdfBuffer);
  });
}

function resolveHouseDocumentUrl({
  documentUrl,
  docId,
  filingYear,
  filingDate
}) {
  const inferredYear =
    filingYear ||
    inferYearFromDate(filingDate) ||
    null;

  if (documentUrl) {
    const normalizedDocumentUrl = String(documentUrl).trim();

    if (
      inferredYear &&
      normalizedDocumentUrl.includes("/public_disc/ptr-pdfs/") &&
      !normalizedDocumentUrl.includes(`/ptr-pdfs/${String(inferredYear).trim()}/`)
    ) {
      const match = normalizedDocumentUrl.match(/\/ptr-pdfs\/([0-9]+)\.pdf$/i);

      if (match?.[1]) {
        return `${HOUSE_BASE_URL}/public_disc/ptr-pdfs/${String(inferredYear).trim()}/${match[1]}.pdf`;
      }
    }

    return normalizedDocumentUrl;
  }

  if (docId && inferredYear) {
    return `${HOUSE_BASE_URL}/public_disc/ptr-pdfs/${String(inferredYear).trim()}/${String(docId).trim()}.pdf`;
  }

  if (docId) {
    return `${HOUSE_BASE_URL}/public_disc/ptr-pdfs/${String(docId).trim()}.pdf`;
  }

  return null;
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


function normalizeText(text) {
  return String(text || "")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\r/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractHousePtrMetadata({
  text,
  memberName,
  filingDate,
  docId,
  documentUrl,
  fetchedAt
}) {
  const filingDateFromText =
    findFirstMatch(text, [
      /filing\s+date\s*[:\-]?\s*(\d{1,2}\/\d{1,2}\/\d{4})/i,
      /date\s+filed\s*[:\-]?\s*(\d{1,2}\/\d{1,2}\/\d{4})/i
    ]) || filingDate;

  const memberNameFromText =
    findFirstMatch(text, [
      /name\s*[:\-]?\s*([A-Z][A-Za-z .,'-]{3,80})/i,
      /representative\s*[:\-]?\s*([A-Z][A-Za-z .,'-]{3,80})/i
    ]) || memberName;

  return {
    chamber: "House",
    member_name: cleanValue(memberNameFromText),
    filing_date: normalizeDate(filingDateFromText),
    doc_id: docId || inferDocIdFromUrl(documentUrl),
    source_id: "house_official_ptr_pdf",
    fetched_at: fetchedAt
  };
}

function inferDocIdFromUrl(documentUrl) {
  const match = String(documentUrl || "").match(/\/([0-9]+)\.pdf$/i);
  return match ? match[1] : null;
}

function findFirstMatch(text, regexes) {
  for (const regex of regexes) {
    const match = String(text || "").match(regex);

    if (match?.[1]) {
      return match[1];
    }
  }

  return null;
}

function extractTransactionCandidates(text) {
  const lines = String(text || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const candidates = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const lowerLine = line.toLowerCase();

    const looksLikeTransaction =
      containsDate(line) &&
      containsAmountRange(line) &&
      containsTransactionType(lowerLine);

    if (looksLikeTransaction) {
      candidates.push({
        line,
        previousLine: lines[index - 1] || "",
        nextLine: lines[index + 1] || ""
      });
    }
  }

  return candidates;
}

function containsDate(value) {
  return /\b\d{1,2}\/\d{1,2}\/\d{4}\b/.test(String(value || ""));
}

function containsAmountRange(value) {
  return /\$?\d{1,3}(,\d{3})*(\.\d+)?\s*[-–]\s*\$?\d{1,3}(,\d{3})*(\.\d+)?/.test(
    String(value || "")
  );
}

function containsTransactionType(lowerLine) {
  return TRANSACTION_TYPE_PATTERNS.some((pattern) => {
    return lowerLine.includes(pattern);
  });
}

function normalizeTransactionCandidate({
  candidate,
  metadata,
  fetchedAt,
  documentUrl
}) {
  const combinedLine = `${candidate.previousLine} ${candidate.line} ${candidate.nextLine}`.trim();

  const transactionDate = extractDate(candidate.line) || extractDate(combinedLine);
  const amount = extractAmountRange(candidate.line) || extractAmountRange(combinedLine);
  const transactionType = extractTransactionType(candidate.line) || extractTransactionType(combinedLine);
  const ticker = extractTicker(combinedLine);
  const assetDescription = extractAssetDescription({
    combinedLine,
    transactionDate,
    amount,
    transactionType,
    ticker
  });

  return {
    chamber: "House",
    member_name: metadata.member_name,
    ticker,
    asset_description: assetDescription,
    transaction_type: transactionType,
    amount,
    transaction_date: normalizeDate(transactionDate),
    disclosure_date: metadata.filing_date,
    reporting_delay_days: calculateDelayDays(transactionDate, metadata.filing_date),
    owner: null,
    raw_reference_url: documentUrl,
    source_id: "house_official_ptr_pdf",
    fetched_at: fetchedAt,
    raw_parser_line: candidate.line,
    raw_context: combinedLine
  };
}

function extractDate(value) {
  const match = String(value || "").match(/\b\d{1,2}\/\d{1,2}\/\d{4}\b/);
  return match ? match[0] : null;
}

function extractAmountRange(value) {
  const match = String(value || "").match(
    /\$?\d{1,3}(,\d{3})*(\.\d+)?\s*[-–]\s*\$?\d{1,3}(,\d{3})*(\.\d+)?/
  );

  return match ? match[0] : null;
}

function extractTransactionType(value) {
  const lowerValue = String(value || "").toLowerCase();

  if (lowerValue.includes("purchase")) return "Purchase";
  if (lowerValue.includes("sale_full")) return "Sale Full";
  if (lowerValue.includes("sale_partial")) return "Sale Partial";
  if (lowerValue.includes("sale")) return "Sale";
  if (lowerValue.includes("exchange")) return "Exchange";

  const compactTokens = lowerValue.split(/\s+/);

  if (compactTokens.includes("p")) return "Purchase";
  if (compactTokens.includes("s")) return "Sale";

  return null;
}

function extractTicker(value) {
  const tickerMatches = String(value || "").match(/\(([A-Z]{1,6})\)/g);

  if (!tickerMatches?.length) {
    return null;
  }

  return tickerMatches[0].replace(/[()]/g, "");
}

function extractAssetDescription({
  combinedLine,
  transactionDate,
  amount,
  transactionType,
  ticker
}) {
  let value = String(combinedLine || "");

  [transactionDate, amount, transactionType, ticker ? `(${ticker})` : null]
    .filter(Boolean)
    .forEach((token) => {
      value = value.replace(token, " ");
    });

  value = value
    .replace(/\s+/g, " ")
    .replace(/^\W+|\W+$/g, "")
    .trim();

  if (value.length > 240) {
    value = value.slice(0, 240).trim();
  }

  return value || null;
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

function calculateDelayDays(transactionDate, disclosureDate) {
  if (!transactionDate || !disclosureDate) {
    return null;
  }

  const tx = new Date(transactionDate);
  const disc = new Date(disclosureDate);

  if (Number.isNaN(tx.getTime()) || Number.isNaN(disc.getTime())) {
    return null;
  }

  return Math.round((disc - tx) / (1000 * 60 * 60 * 24));
}

function cleanValue(value) {
  if (!value) {
    return null;
  }

  return String(value)
    .replace(/\s+/g, " ")
    .replace(/^\W+|\W+$/g, "")
    .trim();
}

function calculateCompleteness(records) {
  if (!records.length) {
    return 0;
  }

  const completeRows = records.filter((record) => {
    return (
      record.member_name &&
      record.asset_description &&
      record.transaction_type &&
      record.amount
    );
  });

  return Math.round((completeRows.length / records.length) * 100);
}

function buildParserNotes(records, text) {
  const notes = [];

  if (!records.length) {
    notes.push(
      "Nessuna riga transazionale individuata con le euristiche V1. Il PDF potrebbe avere layout non testuale, tabella spezzata o richiedere OCR/parser dedicato."
    );
  }

  if (text.length < 500) {
    notes.push(
      "Testo estratto molto breve: possibile PDF scansionato o non testuale."
    );
  }

  notes.push(
    "La V1 usa pattern testuali per date, amount range e transaction type; richiede validazione su campione di PDF."
  );

  return notes;
}
