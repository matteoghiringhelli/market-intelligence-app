const DEFAULT_HOUSE_ZIP_URL_BY_YEAR = {
  2026: "https://disclosures-clerk.house.gov/public_disc/financial-pdfs/2026FD.zip"
};

export async function fetchOfficialHouseFilings({
  year = 2026,
  filingType = "P",
  limit = 50,
  refresh = false,
  zipUrl = null
} = {}) {
  const params = new URLSearchParams({
    chamber: "house",
    year: String(year),
    filingType,
    limit: String(limit),
    refresh: String(refresh)
  });

  const resolvedZipUrl = zipUrl || DEFAULT_HOUSE_ZIP_URL_BY_YEAR[year];

  if (refresh && resolvedZipUrl) {
    params.set("zipUrl", resolvedZipUrl);
  }

  const response = await fetch(
    `/api/market/congress-official-filings-db?${params.toString()}`
  );

  if (!response.ok) {
    const errorPayload = await safeReadJson(response);

    throw new Error(
      errorPayload?.message ||
        errorPayload?.error ||
        `Errore official House filings. Status: ${response.status}`
    );
  }

  return response.json();
}

export async function fetchOfficialSenateStatus({
  year = 2026,
  filingType = "P",
  limit = 50
} = {}) {
  const params = new URLSearchParams({
    chamber: "senate",
    year: String(year),
    filingType,
    limit: String(limit)
  });

  const response = await fetch(
    `/api/market/congress-official-filings-db?${params.toString()}`
  );

  if (!response.ok) {
    const errorPayload = await safeReadJson(response);

    throw new Error(
      errorPayload?.message ||
        errorPayload?.error ||
        `Errore official Senate status. Status: ${response.status}`
    );
  }

  return response.json();
}

async function safeReadJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export async function parseOfficialHouseFilingPdf({
  docId,
  documentUrl,
  memberName = "",
  filingDate = "",
  filingYear = null,
  persist = true,
  limit = 50
} = {}) {
  const params = new URLSearchParams({
    persist: String(persist),
    limit: String(limit)
  });

  if (docId) {
    params.set("docId", docId);
  }

  if (documentUrl) {
    params.set("documentUrl", documentUrl);
  }

  if (memberName) {
    params.set("memberName", memberName);
  }

  if (filingDate) {
    params.set("filingDate", filingDate);
  }

  if (filingYear) {
    params.set("filingYear", String(filingYear));
  }

  const response = await fetch(
    `/api/market/congress-official-pdf-transactions-db?${params.toString()}`
  );

  if (!response.ok) {
    const errorPayload = await safeReadJson(response);

    throw new Error(
      errorPayload?.message ||
        errorPayload?.error ||
        `Errore parser PDF House. Status: ${response.status}`
    );
  }

  return response.json();
}
