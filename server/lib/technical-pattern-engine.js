export function computeTechnicalPatternsFromPriceHistory({
  ticker,
  records
}) {
  const normalizedTicker = String(ticker || "").trim().toUpperCase();
  const sortedRecords = normalizePriceRows(records);

  if (!normalizedTicker || sortedRecords.length < 50) {
    return [];
  }

  const latest = sortedRecords[sortedRecords.length - 1];
  const previous = sortedRecords[sortedRecords.length - 2];

  const enriched = sortedRecords.map((row, index) => {
    return {
      ...row,
      sma20: calculateSma(sortedRecords, index, 20),
      sma50: calculateSma(sortedRecords, index, 50),
      rsi14: calculateRsi(sortedRecords, index, 14),
      avgVolume20: calculateAverageVolume(sortedRecords, index, 20)
    };
  });

  const latestEnriched = enriched[enriched.length - 1];
  const previousEnriched = enriched[enriched.length - 2];

  const patterns = [];

  const windowStart = sortedRecords[Math.max(0, sortedRecords.length - 260)]?.date || sortedRecords[0]?.date;
  const windowEnd = latest.date;

  if (
    latestEnriched.sma20 !== null &&
    latestEnriched.sma50 !== null &&
    latestEnriched.sma20 > latestEnriched.sma50
  ) {
    patterns.push(buildPattern({
      ticker: normalizedTicker,
      patternName: "SMA20 Above SMA50 — Bullish Momentum Configuration",
      detectedAt: latest.date,
      windowStart,
      windowEnd,
      triggerConditions: {
        sma20: latestEnriched.sma20,
        sma50: latestEnriched.sma50,
        condition: "SMA20 > SMA50"
      },
      explanation:
        "La SMA20 superiore alla SMA50 viene normalmente letta come una configurazione in cui il prezzo medio recente è più forte della tendenza intermedia.",
      theoreticalReading:
        "Nella teoria dell'analisi tecnica, questa condizione è coerente con momentum recente favorevole rispetto al trend intermedio.",
      limitations:
        "Le medie mobili sono indicatori ritardati; la configurazione non predice automaticamente la direzione futura e può generare falsi segnali in mercati laterali.",
      strength: calculateSmaSpreadStrength(latestEnriched.sma20, latestEnriched.sma50)
    }));
  }

  if (
    latestEnriched.sma20 !== null &&
    latestEnriched.sma50 !== null &&
    previousEnriched.sma20 !== null &&
    previousEnriched.sma50 !== null &&
    latestEnriched.sma20 > latestEnriched.sma50 &&
    previousEnriched.sma20 <= previousEnriched.sma50
  ) {
    patterns.push(buildPattern({
      ticker: normalizedTicker,
      patternName: "Bullish SMA20/SMA50 Crossover",
      detectedAt: latest.date,
      windowStart,
      windowEnd,
      triggerConditions: {
        previous_sma20: previousEnriched.sma20,
        previous_sma50: previousEnriched.sma50,
        latest_sma20: latestEnriched.sma20,
        latest_sma50: latestEnriched.sma50,
        condition: "SMA20(t) > SMA50(t) and SMA20(t-1) <= SMA50(t-1)"
      },
      explanation:
        "La media mobile breve ha attraversato dal basso verso l'alto la media mobile intermedia.",
      theoreticalReading:
        "I crossover rialzisti sono normalmente interpretati come potenziale miglioramento della struttura di trend, pur restando segnali ritardati.",
      limitations:
        "Il crossover non indica ampiezza o durata del movimento futuro e può essere poco robusto in fasi laterali.",
      strength: 5
    }));
  }

  if (
    latestEnriched.rsi14 !== null &&
    latestEnriched.rsi14 >= 50 &&
    latestEnriched.rsi14 <= 70
  ) {
    patterns.push(buildPattern({
      ticker: normalizedTicker,
      patternName: "RSI14 Supportive Bullish Momentum",
      detectedAt: latest.date,
      windowStart,
      windowEnd,
      triggerConditions: {
        rsi14: latestEnriched.rsi14,
        condition: "50 <= RSI14 <= 70"
      },
      explanation:
        "RSI14 è sopra 50 ma non ancora in area estrema sopra 70.",
      theoreticalReading:
        "Nella lettura tradizionale, RSI sopra 50 è coerente con momentum positivo; sotto 70 evita una lettura immediatamente estesa.",
      limitations:
        "RSI va letto insieme a trend, volume e contesto; da solo non costituisce una decisione operativa.",
      strength: calculateRsiMomentumStrength(latestEnriched.rsi14)
    }));
  }

  if (
    previousEnriched.rsi14 !== null &&
    latestEnriched.rsi14 !== null &&
    previousEnriched.rsi14 < 30 &&
    latestEnriched.rsi14 >= 30
  ) {
    patterns.push(buildPattern({
      ticker: normalizedTicker,
      patternName: "RSI14 Recovery From Oversold",
      detectedAt: latest.date,
      windowStart,
      windowEnd,
      triggerConditions: {
        previous_rsi14: previousEnriched.rsi14,
        latest_rsi14: latestEnriched.rsi14,
        condition: "RSI14(t-1) < 30 and RSI14(t) >= 30"
      },
      explanation:
        "RSI14 è rientrato sopra la soglia 30 dopo una fase di debolezza.",
      theoreticalReading:
        "Il recupero da area oversold viene spesso letto come possibile riduzione della pressione negativa, ma richiede conferme.",
      limitations:
        "Un rimbalzo RSI da oversold non implica automaticamente inversione del trend o recupero duraturo.",
      strength: 3.5
    }));
  }

  if (
    latestEnriched.avgVolume20 !== null &&
    latest.volume !== null &&
    latest.volume > latestEnriched.avgVolume20 * 1.5 &&
    latest.close !== null &&
    previous.close !== null &&
    latest.close > previous.close
  ) {
    patterns.push(buildPattern({
      ticker: normalizedTicker,
      patternName: "Positive Price Move With Relative Volume",
      detectedAt: latest.date,
      windowStart,
      windowEnd,
      triggerConditions: {
        latest_volume: latest.volume,
        avg_volume_20: latestEnriched.avgVolume20,
        close: latest.close,
        previous_close: previous.close,
        condition: "volume > 1.5x avgVolume20 and close > previousClose"
      },
      explanation:
        "Il prezzo è salito in una seduta con volume superiore alla media recente.",
      theoreticalReading:
        "Nell'analisi tecnica, un movimento di prezzo accompagnato da volume superiore alla media è spesso considerato più significativo di un movimento con volume debole.",
      limitations:
        "Il volume elevato non spiega la causa del movimento e può dipendere da news, ribilanciamenti o eventi tecnici.",
      strength: 2.5
    }));
  }

  return deduplicatePatterns(patterns);
}

function normalizePriceRows(records) {
  return (records || [])
    .map((row) => ({
      date: row.date,
      open: normalizeNumber(row.open),
      high: normalizeNumber(row.high),
      low: normalizeNumber(row.low),
      close: normalizeNumber(row.close),
      volume: normalizeNumber(row.volume)
    }))
    .filter((row) => row.date && row.close !== null)
    .sort((a, b) => new Date(a.date) - new Date(b.date));
}

function calculateSma(records, index, period) {
  if (index + 1 < period) {
    return null;
  }

  const slice = records.slice(index + 1 - period, index + 1);
  const closes = slice.map((row) => row.close).filter((value) => value !== null);

  if (closes.length < period) {
    return null;
  }

  return roundNumber(closes.reduce((sum, value) => sum + value, 0) / period);
}

function calculateAverageVolume(records, index, period) {
  if (index + 1 < period) {
    return null;
  }

  const slice = records.slice(index + 1 - period, index + 1);
  const volumes = slice.map((row) => row.volume).filter((value) => value !== null);

  if (volumes.length < period) {
    return null;
  }

  return roundNumber(volumes.reduce((sum, value) => sum + value, 0) / period);
}

function calculateRsi(records, index, period) {
  if (index < period) {
    return null;
  }

  let gains = 0;
  let losses = 0;

  for (let i = index - period + 1; i <= index; i += 1) {
    const currentClose = records[i]?.close;
    const previousClose = records[i - 1]?.close;

    if (currentClose === null || previousClose === null) {
      return null;
    }

    const change = currentClose - previousClose;

    if (change >= 0) {
      gains += change;
    } else {
      losses += Math.abs(change);
    }
  }

  const averageGain = gains / period;
  const averageLoss = losses / period;

  if (averageLoss === 0) {
    return 100;
  }

  const relativeStrength = averageGain / averageLoss;
  const rsi = 100 - 100 / (1 + relativeStrength);

  return roundNumber(rsi);
}

function buildPattern({
  ticker,
  patternName,
  detectedAt,
  windowStart,
  windowEnd,
  triggerConditions,
  explanation,
  theoreticalReading,
  limitations,
  strength
}) {
  return {
    ticker,
    pattern_name: patternName,
    timeframe: "Daily",
    trigger_conditions_json: triggerConditions,
    detected_at: detectedAt,
    window_start: windowStart,
    window_end: windowEnd,
    explanation,
    theoretical_reading: theoreticalReading,
    limitations_note: limitations,
    strength_score: strength,
    source_id: "technical_pattern_engine",
    computed_at: new Date().toISOString()
  };
}

function calculateSmaSpreadStrength(sma20, sma50) {
  if (!sma20 || !sma50) {
    return 1;
  }

  const spreadPct = ((sma20 - sma50) / sma50) * 100;

  if (spreadPct >= 5) return 4;
  if (spreadPct >= 2) return 3;
  if (spreadPct >= 0.5) return 2;

  return 1;
}

function calculateRsiMomentumStrength(rsi) {
  if (rsi >= 60 && rsi <= 70) return 3;
  if (rsi >= 55) return 2.5;
  return 2;
}

function deduplicatePatterns(patterns) {
  const byKey = new Map();

  for (const pattern of patterns) {
    const key = `${pattern.ticker}-${pattern.pattern_name}-${pattern.detected_at}`;
    byKey.set(key, pattern);
  }

  return Array.from(byKey.values());
}

function normalizeNumber(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numberValue = Number(value);

  if (Number.isNaN(numberValue)) {
    return null;
  }

  return numberValue;
}

function roundNumber(value) {
  return Math.round(Number(value) * 1000000) / 1000000;
}
