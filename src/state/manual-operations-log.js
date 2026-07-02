const STORAGE_KEY = "market_intelligence_manual_operations_log";
const MAX_LOG_ITEMS = 10;

export function getManualOperationsLog() {
  try {
    const storedValue = window.localStorage.getItem(STORAGE_KEY);

    if (!storedValue) {
      return [];
    }

    const parsedValue = JSON.parse(storedValue);

    if (!Array.isArray(parsedValue)) {
      return [];
    }

    return parsedValue;
  } catch {
    return [];
  }
}

export function addManualOperationLogEntry(entry) {
  const currentLog = getManualOperationsLog();

  const nextEntry = {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    jobType: entry.jobType || "unknown",
    status: entry.status || "unknown",
    symbols: entry.symbols || "",
    message: entry.message || "",
    startedAt: entry.startedAt || null,
    finishedAt: entry.finishedAt || new Date().toISOString()
  };

  const nextLog = [nextEntry, ...currentLog].slice(0, MAX_LOG_ITEMS);

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextLog));

  window.dispatchEvent(
    new CustomEvent("manual-operations-log-updated", {
      detail: nextLog
    })
  );

  return nextLog;
}

export function clearManualOperationsLog() {
  window.localStorage.removeItem(STORAGE_KEY);

  window.dispatchEvent(
    new CustomEvent("manual-operations-log-updated", {
      detail: []
    })
  );

  return [];
}