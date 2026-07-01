const STORAGE_KEY = "market_intelligence_real_data_status";

const DEFAULT_STATUS = {
  status: "mock",
  label: "Mock only",
  provider: "none",
  sourceId: "mock",
  lastUpdatedAt: null,
  loadedSymbols: [],
  message:
    "La Home Overview e la Dashboard stanno usando dati mock. Nessuna fonte reale è stata caricata in questa sessione."
};

export function getRealDataStatus() {
  try {
    const storedValue = window.localStorage.getItem(STORAGE_KEY);

    if (!storedValue) {
      return DEFAULT_STATUS;
    }

    return {
      ...DEFAULT_STATUS,
      ...JSON.parse(storedValue)
    };
  } catch {
    return DEFAULT_STATUS;
  }
}

export function setRealDataStatus(nextStatus) {
  const currentStatus = getRealDataStatus();

  const updatedStatus = {
    ...currentStatus,
    ...nextStatus
  };

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedStatus));

  window.dispatchEvent(
    new CustomEvent("real-data-status-updated", {
      detail: updatedStatus
    })
  );

  return updatedStatus;
}

export function resetRealDataStatus() {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_STATUS));

  window.dispatchEvent(
    new CustomEvent("real-data-status-updated", {
      detail: DEFAULT_STATUS
    })
  );

  return DEFAULT_STATUS;
}