export async function runDailyHistoryUpdate({
  symbols,
  days,
  secret
}) {
  const params = new URLSearchParams({
    symbols,
    days: String(days),
    secret
  });

  const response = await fetch(`/api/jobs/daily-history-update?${params.toString()}`);

  if (!response.ok) {
    const errorPayload = await safeReadJson(response);

    throw new Error(
      errorPayload?.message ||
        errorPayload?.error ||
        `Errore daily-history-update. Status: ${response.status}`
    );
  }

  return response.json();
}

export async function runDetectTechnicalPatterns({
  symbols,
  limit,
  secret
}) {
  const params = new URLSearchParams({
    symbols,
    limit: String(limit),
    secret
  });

  const response = await fetch(`/api/jobs/detect-technical-patterns?${params.toString()}`);

  if (!response.ok) {
    const errorPayload = await safeReadJson(response);

    throw new Error(
      errorPayload?.message ||
        errorPayload?.error ||
        `Errore detect-technical-patterns. Status: ${response.status}`
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