export async function fetchFundamentals({
  symbols,
  refresh = false
} = {}) {
  const params = new URLSearchParams({
    symbols: Array.isArray(symbols) ? symbols.join(",") : String(symbols || ""),
    refresh: String(refresh)
  });

  const response = await fetch(`/api/market/fundamentals-db?${params.toString()}`);

  if (!response.ok) {
    const errorPayload = await safeReadJson(response);

    throw new Error(
      errorPayload?.message ||
        errorPayload?.error ||
        `Errore fundamentals. Status: ${response.status}`
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
