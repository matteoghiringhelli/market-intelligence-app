export async function fetchDataQualityOverview() {
  const response = await fetch("/api/market/data-quality-db");

  if (!response.ok) {
    const errorPayload = await safeReadJson(response);

    throw new Error(
      errorPayload?.message ||
        errorPayload?.error ||
        `Errore nel recupero Data Quality. Status: ${response.status}`
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