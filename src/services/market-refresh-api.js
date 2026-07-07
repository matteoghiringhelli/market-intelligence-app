export async function runMarketRefreshBatch({
  offset = 0,
  batchSize = 10,
  days = 260,
  limit = 260,
  secret = ""
} = {}) {
  const normalizedSecret = String(secret || "").trim();

  const historyUrl = buildUrl("/api/jobs/daily-history-update", {
    symbols: "all",
    offset,
    batchSize,
    days,
    secret: normalizedSecret
  });

  const patternsUrl = buildUrl("/api/jobs/detect-technical-patterns", {
    symbols: "all",
    offset,
    batchSize,
    limit,
    secret: normalizedSecret
  });

  const fundamentalsUrl = buildUrl("/api/jobs/fundamentals-lite-update", {
    symbols: "all",
    offset,
    batchSize,
    secret: normalizedSecret
  });

  const topSignalsUrl = buildUrl("/api/market/top-bullish-signals-db", {
    limit: 10,
    refresh: "true"
  });

  const history = await fetchJson(historyUrl);
  const patterns = await fetchJson(patternsUrl);
  const fundamentals = await fetchJson(fundamentalsUrl);
  const topSignals = await fetchJson(topSignalsUrl);

  return {
    offset,
    batchSize,
    history,
    patterns,
    fundamentals,
    topSignals
  };
}

export async function runMarketRefreshSeries({
  startOffset = 0,
  batches = 1,
  batchSize = 10,
  days = 260,
  limit = 260,
  secret = "",
  onProgress
} = {}) {
  const results = [];

  for (let index = 0; index < Number(batches || 1); index += 1) {
    const offset = Number(startOffset || 0) + index * Number(batchSize || 10);

    if (typeof onProgress === "function") {
      onProgress({
        status: "running",
        currentBatch: index + 1,
        totalBatches: Number(batches || 1),
        offset
      });
    }

    const result = await runMarketRefreshBatch({
      offset,
      batchSize,
      days,
      limit,
      secret
    });

    results.push(result);

    if (typeof onProgress === "function") {
      onProgress({
        status: "completed_batch",
        currentBatch: index + 1,
        totalBatches: Number(batches || 1),
        offset,
        result
      });
    }
  }

  return results;
}

function buildUrl(path, params) {
  const searchParams = new URLSearchParams();

  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== null && value !== undefined && String(value) !== "") {
      searchParams.set(key, String(value));
    }
  });

  return `${path}?${searchParams.toString()}`;
}

async function fetchJson(url) {
  const response = await fetch(url);
  const payload = await safeReadJson(response);

  if (!response.ok) {
    throw new Error(
      payload?.message ||
        payload?.error ||
        `Request failed. Status: ${response.status}`
    );
  }

  return payload;
}

async function safeReadJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}
