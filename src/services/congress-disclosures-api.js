export async function fetchRealCongressDisclosures({
  symbol = "",
  chamber = "both",
  limit = 50
} = {}) {
  const params = new URLSearchParams({
    chamber,
    limit: String(limit)
  });

  if (symbol) {
    params.set("symbol", symbol);
  }

  const response = await fetch(`/api/market/congress-disclosures-db?${params.toString()}`);

  if (!response.ok) {
    const errorPayload = await safeReadJson(response);

    throw new Error(
      errorPayload?.message ||
      errorPayload?.error ||
      `Errore congress disclosures. Status: ${response.status}`
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
