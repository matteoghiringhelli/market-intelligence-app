export function computeTechnicalPatternsFromPriceHistory({
  ticker,
  records
}) {
  const sortedRecords = normalizeAndSortRecords(records);

  if (sortedRecords.length < 20) {
    return [
      buildInsufficientDataPattern({
        ticker,
        records: sortedRecords,
        requiredRecords: 20
      })
    ];
  }

  const patterns = [];

  const smaPattern = detectSma20Sma50Pattern({
    ticker,
    records: sortedRecords
  });

  if (smaPattern) {
    patterns.push(smaPattern);
  }

  const rsiPattern = detectRsi14Pattern({
    ticker,
    records: sortedRecords
  });

  if (rsiPattern) {
    patterns.push(rsiPattern);
  }

  const volumePattern = detectRelativeVolumePattern({
    ticker,
    records: sortedRecords
  });

  if (volumePattern) {
    patterns.push(volumePattern);
  }

  if (!patterns.length) {
    patterns.push({
      ticker,
      pattern_name: "Nessun pattern tecnico descrittivo rilevante",
      timeframe: `Daily, ultimi ${sortedRecords.length} record disponibili`,
      explanation:
        "Nel periodo osservato non sono state rilevate condizioni descrittive tra quelle attualmente implementate.",
      trigger_conditions_json: {
        implemented_checks: [
          "SMA20/SMA50",
          "RSI14",
          "Volume relativo 20 giorni"
        ],
        result: "no_pattern_detected"
      },
      detected_at: sortedRecords[sortedRecords.length - 1]?.date || null,
      window_start: sortedRecords[0]?.date || null,
      window_end: sortedRecords[sortedRecords.length - 1]?.date || null,
      limitations_note:
        "L'assenza di pattern rilevati non implica alcuna indicazione operativa. Il risultato è puramente descrittivo e dipende dalle regole implementate.",
      source_id: "financial_modeling_prep"
    });
  }

  return patterns;
}

function normalizeAndSortRecords(records) {
  return [...records]
    .filter((record) => record.date && record.close !== null && record.close !== undefined)
    .map((record) => ({
      ...record,
      close: Number(record.close),
      volume: record.volume === null || record.volume === undefined ? null : Number(record.volume)
    }))
    .filter((record) => !Number.isNaN(record.close))
    .sort((a, b) => new Date(a.date) - new Date(b.date));
}

function detectSma20Sma50Pattern({ ticker, records }) {
  if (records.length < 50) {
    return null;
  }

  const closes = records.map((record) => record.close);
  const sma20 = simpleMovingAverage(closes, 20);
  const sma50 = simpleMovingAverage(closes, 50);

  const latestRecord = records[records.length - 1];
  const previousRecord = records[records.length - 2];

  const latestSma20 = sma20[sma20.length - 1];
  const previousSma20 = sma20[sma20.length - 2];

  const latestSma50 = sma50[sma50.length - 1];
  const previousSma50 = sma50[sma50.length - 2];

  if (!latestSma20 || !latestSma50 || !previousSma20 || !previousSma50) {
    return null;
  }

  const crossedAbove =
    latestSma20.value > latestSma50.value &&
    previousSma20.value <= previousSma50.value;

  const above =
    latestSma20.value > latestSma50.value;

  if (!crossedAbove && !above) {
    return null;
  }

  return {
    ticker,
    pattern_name: crossedAbove
      ? "Incrocio SMA20/SMA50"
      : "SMA20 superiore a SMA50",
    timeframe: "Daily, ultimi 50+ record disponibili",
    explanation: crossedAbove
      ? "La media mobile semplice a 20 giorni ha superato la media mobile semplice a 50 giorni nell'ultima finestra osservata."
      : "La media mobile semplice a 20 giorni risulta superiore alla media mobile semplice a 50 giorni nell'ultima osservazione disponibile.",
    trigger_conditions_json: {
      condition: crossedAbove
        ? "SMA20(t) > SMA50(t) e SMA20(t-1) <= SMA50(t-1)"
        : "SMA20(t) > SMA50(t)",
      latest_sma20: roundNumber(latestSma20.value),
      latest_sma50: roundNumber(latestSma50.value),
      previous_sma20: roundNumber(previousSma20.value),
      previous_sma50: roundNumber(previousSma50.value),
      latest_close: roundNumber(latestRecord.close)
    },
    detected_at: latestRecord.date,
    window_start: records[Math.max(0, records.length - 50)]?.date || records[0]?.date || null,
    window_end: latestRecord.date,
    limitations_note:
      "Le medie mobili sono indicatori ritardati e non indicano direzione, probabilità o ampiezza futura del movimento.",
    source_id: latestRecord.source_id || "financial_modeling_prep"
  };
}

function detectRsi14Pattern({ ticker, records }) {
  if (records.length < 15) {
    return null;
  }

  const closes = records.map((record) => record.close);
  const rsi = calculateRsi(closes, 14);

  if (rsi === null) {
    return null;
  }

  const latestRecord = records[records.length - 1];

  let patternName = null;
  let explanation = null;
  let condition = null;

  if (rsi >= 70) {
    patternName = "RSI14 sopra soglia 70";
    explanation =
      "L'indicatore RSI a 14 periodi risulta sopra la soglia 70 nell'ultima osservazione disponibile.";
    condition = "RSI14 >= 70";
  } else if (rsi <= 30) {
    patternName = "RSI14 sotto soglia 30";
    explanation =
      "L'indicatore RSI a 14 periodi risulta sotto la soglia 30 nell'ultima osservazione disponibile.";
    condition = "RSI14 <= 30";
  } else if (rsi > 50) {
    patternName = "RSI14 sopra area neutrale";
    explanation =
      "L'indicatore RSI a 14 periodi risulta sopra il livello neutrale 50 nell'ultima osservazione disponibile.";
    condition = "RSI14 > 50";
  } else {
    return null;
  }

  return {
    ticker,
    pattern_name: patternName,
    timeframe: "Daily, RSI14",
    explanation,
    trigger_conditions_json: {
      condition,
      rsi14: roundNumber(rsi),
      latest_close: roundNumber(latestRecord.close)
    },
    detected_at: latestRecord.date,
    window_start: records[Math.max(0, records.length - 15)]?.date || records[0]?.date || null,
    window_end: latestRecord.date,
    limitations_note:
      "RSI è un indicatore descrittivo di momentum sul periodo osservato. Non indica necessariamente continuità futura del movimento.",
    source_id: latestRecord.source_id || "financial_modeling_prep"
  };
}

function detectRelativeVolumePattern({ ticker, records }) {
  if (records.length < 21) {
    return null;
  }

  const latestRecord = records[records.length - 1];

  if (!latestRecord.volume || Number.isNaN(Number(latestRecord.volume))) {
    return null;
  }

  const previousTwentyRecords = records.slice(records.length - 21, records.length - 1);
  const volumes = previousTwentyRecords
    .map((record) => Number(record.volume))
    .filter((value) => !Number.isNaN(value) && value > 0);

  if (volumes.length < 10) {
    return null;
  }

  const averageVolume =
    volumes.reduce((sum, value) => sum + value, 0) / volumes.length;

  const relativeVolume = Number(latestRecord.volume) / averageVolume;

  if (relativeVolume < 1.5) {
    return null;
  }

  return {
    ticker,
    pattern_name: "Volume relativo superiore alla media 20 giorni",
    timeframe: "Daily, volume relativo 20 giorni",
    explanation:
      "Il volume dell'ultima osservazione risulta superiore alla media dei volumi delle precedenti 20 osservazioni disponibili.",
    trigger_conditions_json: {
      condition: "Volume(t) >= 1.5 * media_volume_20",
      latest_volume: Number(latestRecord.volume),
      average_volume_20: Math.round(averageVolume),
      relative_volume: roundNumber(relativeVolume)
    },
    detected_at: latestRecord.date,
    window_start: previousTwentyRecords[0]?.date || null,
    window_end: latestRecord.date,
    limitations_note:
      "Un volume superiore alla media non spiega da solo la causa del movimento e non indica una direzione futura.",
    source_id: latestRecord.source_id || "financial_modeling_prep"
  };
}

function buildInsufficientDataPattern({ ticker, records, requiredRecords }) {
  return {
    ticker,
    pattern_name: "Dati storici insufficienti per pattern tecnici",
    timeframe: `Daily, ${records.length} record disponibili`,
    explanation:
      "Il numero di record storici disponibili non è sufficiente per calcolare i pattern tecnici implementati.",
    trigger_conditions_json: {
      available_records: records.length,
      required_records: requiredRecords,
      result: "insufficient_data"
    },
    detected_at: records[records.length - 1]?.date || null,
    window_start: records[0]?.date || null,
    window_end: records[records.length - 1]?.date || null,
    limitations_note:
      "Il calcolo richiede uno storico minimo. Nessuna indicazione operativa può essere derivata da questo stato.",
    source_id: records[records.length - 1]?.source_id || "financial_modeling_prep"
  };
}

function simpleMovingAverage(values, period) {
  const result = [];

  for (let index = period - 1; index < values.length; index += 1) {
    const windowValues = values.slice(index - period + 1, index + 1);
    const sum = windowValues.reduce((acc, value) => acc + value, 0);

    result.push({
      index,
      value: sum / period
    });
  }

  return result;
}

function calculateRsi(values, period) {
  if (values.length <= period) {
    return null;
  }

  const recentValues = values.slice(values.length - period - 1);
  let gains = 0;
  let losses = 0;

  for (let index = 1; index < recentValues.length; index += 1) {
    const change = recentValues[index] - recentValues[index - 1];

    if (change > 0) {
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

  return 100 - 100 / (1 + relativeStrength);
}

function roundNumber(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return null;
  }

  return Math.round(Number(value) * 100) / 100;
}