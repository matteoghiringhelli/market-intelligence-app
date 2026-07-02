export async function fetchRealPeerComparison(symbol = "AAPL", limit = 8, refresh = false) {
  const params = new URLSearchParams({
    symbol,
    limit: String(limit),
    refresh: String(refresh)
  });

  const response = await fetch(`/api/market/peer-compare-db?${params.toString()}`);

  if (!response.ok) {
    const errorPayload = await safeReadJson(response);

    throw new Error(
      errorPayload?.message ||
        errorPayload?.error ||
        `Errore peer compare. Status: ${response.status}`
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
