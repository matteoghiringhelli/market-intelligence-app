export async function fetchHistoricalPricesFromDb(symbol, limit = 60) {
  const params = new URLSearchParams({
    symbol,
    limit: String(limit)
  });

  const response = await fetch(`/api/market/history-db?${params.toString()}`);

  if (!response.ok) {
    const errorPayload = await safeReadJson(response);

    throw new Error(
      errorPayload?.message ||
        errorPayload?.error ||
        `Errore nel recupero storico per ${symbol}. Status: ${response.status}`
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