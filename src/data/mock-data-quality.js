export const mockDataQualitySources = [
  {
    sourceId: "mock_securities",
    datasetName: "Anagrafica titoli",
    freshness: "Aggiornato",
    completeness: "100%",
    reliabilityTier: "Mock educational",
    lastFetchedAt: "2026-06-30",
    dataAsOf: "2026-06-30",
    knownIssues: "Dataset dimostrativo non collegato a fonte reale."
  },
  {
    sourceId: "mock_fundamentals",
    datasetName: "Fondamentali",
    freshness: "Parziale",
    completeness: "92%",
    reliabilityTier: "Mock educational",
    lastFetchedAt: "2026-06-30",
    dataAsOf: "FY2025",
    knownIssues:
      "Alcune metriche sono semplificate e non includono normalizzazioni avanzate."
  },
  {
    sourceId: "mock_technical_patterns",
    datasetName: "Pattern tecnici",
    freshness: "Aggiornato",
    completeness: "88%",
    reliabilityTier: "Mock educational",
    lastFetchedAt: "2026-06-30",
    dataAsOf: "2026-06-30",
    knownIssues:
      "I pattern sono dimostrativi e non calcolati su una serie storica reale."
  },
  {
    sourceId: "mock_congress_disclosures",
    datasetName: "Disclosure Congresso",
    freshness: "Non ancora implementato",
    completeness: "0%",
    reliabilityTier: "Non disponibile",
    lastFetchedAt: "n/d",
    dataAsOf: "n/d",
    knownIssues:
      "La sezione sarà implementata in una fase successiva con parsing e normalizzazione dedicati."
  }
];