export async function fetchRealQuote(symbol, provider = "fmp") {
  const params = new URLSearchParams({
    symbol,
    provider
  });

  const response = await fetch(`/api/market/quote?${params.toString()}`);

  if (!response.ok) {
    const errorPayload = await safeReadJson(response);

    throw new Error(
      errorPayload?.message ||
        errorPayload?.error ||
        `Errore nel recupero della quote per ${symbol}. Status: ${response.status}`
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