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
    freshness: "Mock disponibile",
    completeness: "85%",
    reliabilityTier: "Mock educational",
    lastFetchedAt: "2026-06-30",
    dataAsOf: "2026-06-30",
    knownIssues:
      "La sezione usa dati mock. In una fase successiva serviranno ingestion, parsing, normalizzazione e entity resolution da fonti ufficiali."
  }
];