export async function refreshMarketUniverse() {
  const response = await fetch("/api/market/universe-db?action=refresh");

  if (!response.ok) {
    const errorPayload = await safeReadJson(response);

    throw new Error(
      errorPayload?.message ||
        errorPayload?.error ||
        `Universe refresh failed. Status: ${response.status}`
    );
  }

  return response.json();
}

export async function searchMarketUniverse(query, limit = 20) {
  const params = new URLSearchParams({
    action: "search",
    query,
    limit: String(limit)
  });

  const response = await fetch(`/api/market/universe-db?${params.toString()}`);

  if (!response.ok) {
    const errorPayload = await safeReadJson(response);

    throw new Error(
      errorPayload?.message ||
        errorPayload?.error ||
        `Universe search failed. Status: ${response.status}`
    );
  }

  return response.json();
}

export async function fetchTopBullishSignals(limit = 10, refresh = false) {
  const params = new URLSearchParams({
    limit: String(limit),
    refresh: String(refresh)
  });

  const response = await fetch(`/api/market/top-bullish-signals-db?${params.toString()}`);

  if (!response.ok) {
    const errorPayload = await safeReadJson(response);

    throw new Error(
      errorPayload?.message ||
        errorPayload?.error ||
        `Top bullish fetch failed. Status: ${response.status}`
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
