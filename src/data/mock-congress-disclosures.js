export const mockCongressDisclosures = [
  {
    disclosureId: "mock-disclosure-001",
    memberName: "Public Official A",
    chamber: "House",
    disclosureDate: "2026-06-25",
    transactionDate: "2026-05-24",
    ticker: "AAPL",
    assetDescription: "Apple Inc.",
    transactionType: "Purchase",
    amountRange: "$15,001 - $50,000",
    reportingDelayDays: 32,
    source: "Mock dataset educativo",
    rawReferenceUrl: "n/d",
    mappingStatus: "Ticker associato tramite mock dataset",
    limitations:
      "Importo indicato come intervallo. La disclosure non comunica l'importo esatto e può essere soggetta a correzioni successive."
  },
  {
    disclosureId: "mock-disclosure-002",
    memberName: "Public Official B",
    chamber: "Senate",
    disclosureDate: "2026-06-18",
    transactionDate: "2026-06-02",
    ticker: "MSFT",
    assetDescription: "Microsoft Corporation",
    transactionType: "Sale",
    amountRange: "$50,001 - $100,000",
    reportingDelayDays: 16,
    source: "Mock dataset educativo",
    rawReferenceUrl: "n/d",
    mappingStatus: "Ticker associato tramite mock dataset",
    limitations:
      "La transazione è mostrata solo come dato pubblico descrittivo. Non viene generata alcuna inferenza sulle intenzioni del dichiarante."
  },
  {
    disclosureId: "mock-disclosure-003",
    memberName: "Public Official C",
    chamber: "House",
    disclosureDate: "2026-06-12",
    transactionDate: "2026-04-29",
    ticker: "UNRESOLVED",
    assetDescription: "Technology Growth Fund",
    transactionType: "Purchase",
    amountRange: "$1,001 - $15,000",
    reportingDelayDays: 44,
    source: "Mock dataset educativo",
    rawReferenceUrl: "n/d",
    mappingStatus: "Security ID non risolto",
    limitations:
      "La descrizione dell'asset non è stata associata con certezza a un singolo ticker. Il dato va interpretato come informazione non completamente normalizzata."
  },
  {
    disclosureId: "mock-disclosure-004",
    memberName: "Public Official D",
    chamber: "Senate",
    disclosureDate: "2026-06-05",
    transactionDate: "2026-05-10",
    ticker: "JPM",
    assetDescription: "JPMorgan Chase & Co.",
    transactionType: "Sale",
    amountRange: "$15,001 - $50,000",
    reportingDelayDays: 26,
    source: "Mock dataset educativo",
    rawReferenceUrl: "n/d",
    mappingStatus: "Ticker associato tramite mock dataset",
    limitations:
      "Il dataset è dimostrativo. Le disclosure reali possono presentare ritardi, intervalli ampi e descrizioni non standardizzate."
  }
];