const NASDAQ_LISTED_URL =
  "https://www.nasdaqtrader.com/dynamic/SymDir/nasdaqlisted.txt";

const OTHER_LISTED_URL =
  "https://www.nasdaqtrader.com/dynamic/SymDir/otherlisted.txt";

export async function fetchFmpStockUniverse() {
  return fetchNasdaqTraderStockUniverse();
}

export async function fetchNasdaqTraderStockUniverse() {
  const fetchedAt = new Date().toISOString();

  try {
    const [nasdaqResult, otherResult] = await Promise.all([
      fetchTextFile({
        url: NASDAQ_LISTED_URL,
        sourceFile: "nasdaqlisted.txt"
      }),
      fetchTextFile({
        url: OTHER_LISTED_URL,
        sourceFile: "otherlisted.txt"
      })
    ]);

    const failures = [nasdaqResult, otherResult].filter((result) => !result.ok);

    if (failures.length) {
      return {
        ok: false,
        status: failures[0].status || 502,
        payload: {
          error: "NASDAQ_TRADER_SYMBOL_DIRECTORY_FAILED",
          message:
            "Errore durante il recupero dei file ufficiali NasdaqTrader Symbol Directory.",
          failures: failures.map((failure) => failure.payload),
          source_id: "nasdaq_trader_symbol_directory",
          fetched_at: fetchedAt
        }
      };
    }

    const nasdaqRows = parseNasdaqListedFile({
      text: nasdaqResult.text,
      fetchedAt
    });

    const otherRows = parseOtherListedFile({
      text: otherResult.text,
      fetchedAt
    });

    const records = deduplicateByTicker([...nasdaqRows, ...otherRows]);

    return {
      ok: true,
      status: 200,
      payload: {
        data: {
          records_count: records.length,
          records
        },
        data_quality: {
          source_id: "nasdaq_trader_symbol_directory",
          fetched_at: fetchedAt,
          completeness_score: records.length ? 100 : 0
        },
        disclaimer:
          "Universe Nasdaq/NYSE da NasdaqTrader Symbol Directory. Filtri V1: Nasdaq-listed + Other-listed NYSE, esclusi ETF e test issues quando il campo è disponibile."
      }
    };
  } catch (error) {
    return {
      ok: false,
      status: 500,
      payload: {
        error: "NASDAQ_TRADER_UNIVERSE_FETCH_FAILED",
        message: error.message,
        source_id: "nasdaq_trader_symbol_directory",
        fetched_at: fetchedAt
      }
    };
  }
}

async function fetchTextFile({ url, sourceFile }) {
  const fetchedAt = new Date().toISOString();

  try {
    const response = await fetch(url);

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        payload: {
          error: "NASDAQ_TRADER_TEXT_FILE_HTTP_ERROR",
          message: `Errore HTTP durante il download di ${sourceFile}.`,
          status: response.status,
          source_file: sourceFile,
          source_url: url,
          source_id: "nasdaq_trader_symbol_directory",
          fetched_at: fetchedAt
        }
      };
    }

    return {
      ok: true,
      status: 200,
      text: await response.text()
    };
  } catch (error) {
    return {
      ok: false,
      status: 500,
      payload: {
        error: "NASDAQ_TRADER_TEXT_FILE_FETCH_FAILED",
        message: error.message,
        source_file: sourceFile,
        source_url: url,
        source_id: "nasdaq_trader_symbol_directory",
        fetched_at: fetchedAt
      }
    };
  }
}

function parseNasdaqListedFile({ text, fetchedAt }) {
  const rows = parsePipeDelimitedText(text);

  return rows
    .filter((row) => {
      return (
        row.Symbol &&
        row["Security Name"] &&
        row["Test Issue"] !== "Y" &&
        row.ETF !== "Y" &&
        !isFileCreationRow(row.Symbol)
      );
    })
    .map((row) => ({
      ticker: cleanTicker(row.Symbol),
      company_name: cleanSecurityName(row["Security Name"]),
      exchange: "NASDAQ",
      exchange_short_name: "NASDAQ",
      security_type: "listed_equity_candidate",
      source_id: "nasdaq_trader_symbol_directory",
      fetched_at: fetchedAt,
      raw_payload: {
        ...row,
        source_file: "nasdaqlisted.txt"
      }
    }))
    .filter((row) => row.ticker);
}

function parseOtherListedFile({ text, fetchedAt }) {
  const rows = parsePipeDelimitedText(text);

  return rows
    .filter((row) => {
      return (
        row["ACT Symbol"] &&
        row["Security Name"] &&
        row.Exchange === "N" &&
        row["Test Issue"] !== "Y" &&
        row.ETF !== "Y" &&
        !isFileCreationRow(row["ACT Symbol"])
      );
    })
    .map((row) => ({
      ticker: cleanTicker(row["ACT Symbol"]),
      company_name: cleanSecurityName(row["Security Name"]),
      exchange: "NYSE",
      exchange_short_name: "NYSE",
      security_type: "listed_equity_candidate",
      source_id: "nasdaq_trader_symbol_directory",
      fetched_at: fetchedAt,
      raw_payload: {
        ...row,
        source_file: "otherlisted.txt"
      }
    }))
    .filter((row) => row.ticker);
}

function parsePipeDelimitedText(text) {
  const lines = String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return [];
  }

  const headers = lines[0].split("|").map((header) => header.trim());

  return lines.slice(1).map((line) => {
    const values = line.split("|");
    const row = {};

    headers.forEach((header, index) => {
      row[header] = values[index] !== undefined ? values[index].trim() : null;
    });

    return row;
  });
}

function deduplicateByTicker(records) {
  const byTicker = new Map();

  for (const record of records) {
    if (!record.ticker) {
      continue;
    }

    if (!byTicker.has(record.ticker)) {
      byTicker.set(record.ticker, record);
    }
  }

  return Array.from(byTicker.values()).sort((a, b) =>
    a.ticker.localeCompare(b.ticker)
  );
}

function cleanTicker(value) {
  if (!value) {
    return null;
  }

  const ticker = String(value).trim().toUpperCase();

  if (!ticker) {
    return null;
  }

  if (ticker.includes(" ")) {
    return null;
  }

  if (ticker.length > 12) {
    return null;
  }

  return ticker;
}

function cleanSecurityName(value) {
  if (!value) {
    return null;
  }

  return String(value)
    .replace(/\s+/g, " ")
    .trim();
}

function isFileCreationRow(value) {
  return String(value || "")
    .toLowerCase()
    .startsWith("file creation time");
}
