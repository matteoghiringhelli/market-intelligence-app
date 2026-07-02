export async function fetchTechnicalPatternsFromDb(symbol = null, limit = 20) {
  const params = new URLSearchParams({
    limit: String(limit)
  });

  if (symbol) {
    params.set("symbol", symbol);
  }

  const response = await fetch(`/api/market/technical-patterns-db?${params.toString()}`);

  if (!response.ok) {
    const errorPayload = await safeReadJson(response);

    throw new Error(
      errorPayload?.message ||
        errorPayload?.error ||
        `Errore nel recupero pattern tecnici. Status: ${response.status}`
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