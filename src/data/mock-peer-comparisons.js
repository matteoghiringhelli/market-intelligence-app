export const mockPeerComparisons = [
  {
    ticker: "AAPL",
    companyName: "Apple Inc.",
    peerGroup: "Technology Hardware",
    metricName: "Gross Margin",
    metricValue: "46.2%",
    peerMedian: "38.1%",
    deviation: "+8.1 punti percentuali",
    period: "FY2025",
    sampleSize: 12,
    source: "Mock dataset educativo",
    completeness: "100%",
    limitation:
      "Il peer group è dimostrativo e non rappresenta una classificazione ufficiale."
  },
  {
    ticker: "MSFT",
    companyName: "Microsoft Corporation",
    peerGroup: "Software Infrastructure",
    metricName: "Gross Margin",
    metricValue: "69.4%",
    peerMedian: "57.0%",
    deviation: "+12.4 punti percentuali",
    period: "FY2025",
    sampleSize: 14,
    source: "Mock dataset educativo",
    completeness: "95%",
    limitation:
      "Il confronto non depura automaticamente eventi non ricorrenti o riclassificazioni contabili."
  },
  {
    ticker: "JPM",
    companyName: "JPMorgan Chase & Co.",
    peerGroup: "Large Banks",
    metricName: "Return on Equity",
    metricValue: "15.2%",
    peerMedian: "13.8%",
    deviation: "+1.4 punti percentuali",
    period: "FY2025",
    sampleSize: 9,
    source: "Mock dataset educativo",
    completeness: "90%",
    limitation:
      "Le metriche bancarie non sono direttamente confrontabili con metriche industriali o software."
  }
];