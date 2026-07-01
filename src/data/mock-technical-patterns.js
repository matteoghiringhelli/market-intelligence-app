export const mockTechnicalPatterns = [
  {
    ticker: "AAPL",
    patternName: "Golden Cross (SMA50/SMA200)",
    timeframe: "Daily, ultimi 250 giorni",
    explanation:
      "La media mobile a 50 giorni ha superato la media mobile a 200 giorni.",
    triggerConditions:
      "SMA50(t) > SMA200(t) e SMA50(t-1) <= SMA200(t-1)",
    detectedAt: "2026-06-20",
    source: "Mock dataset educativo",
    limitations:
      "Indicatore ritardato; può generare falsi segnali in mercati laterali; non indica la magnitudine del movimento futuro."
  },
  {
    ticker: "MSFT",
    patternName: "RSI sopra area neutrale",
    timeframe: "Daily, ultimi 14 giorni",
    explanation:
      "L'indicatore RSI si trova sopra il livello neutrale di 50 nel periodo osservato.",
    triggerConditions:
      "RSI(14) > 50",
    detectedAt: "2026-06-28",
    source: "Mock dataset educativo",
    limitations:
      "Il momentum osservato è descrittivo e non implica continuità futura del movimento."
  },
  {
    ticker: "JPM",
    patternName: "Volume relativo superiore alla media",
    timeframe: "Daily, ultimi 30 giorni",
    explanation:
      "Il volume dell'ultima seduta è superiore alla media dei volumi osservata nel periodo.",
    triggerConditions:
      "Volume(t) > media volume 30 giorni",
    detectedAt: "2026-06-27",
    source: "Mock dataset educativo",
    limitations:
      "Il volume elevato non spiega da solo la causa del movimento e non indica una direzione futura."
  }
];