export const interpretationGuideSections = [
  {
    id: "principles",
    eyebrow: "Principi generali",
    title: "Interpretare non significa raccomandare",
    description:
      "L'app fornisce una lettura teorica ed educativa dei dati. L'obiettivo è spiegare come un indicatore viene normalmente interpretato nei framework di analisi finanziaria, senza trasformarlo in una raccomandazione operativa.",
    theoreticalInterpretation:
      "Nella pratica dell'analisi finanziaria, un indicatore non viene quasi mai letto da solo. Pattern tecnici, fondamentali, peer comparison e qualità del dato vengono combinati per costruire un quadro interpretativo. Questo quadro può suggerire che una determinata condizione sia coerente con momentum, debolezza, valutazione elevata, qualità reddituale o rischio finanziario, ma non produce automaticamente una decisione di investimento.",
    howToRead: [
      "Prima leggere cosa misura l'indicatore.",
      "Poi leggere come la teoria lo interpreta normalmente.",
      "Poi verificare periodo, fonte, qualità e contesto.",
      "Infine leggere i limiti e le condizioni in cui l'indicatore può essere meno affidabile."
    ],
    notToConclude: [
      "Non concludere automaticamente che un titolo sia da comprare o vendere.",
      "Non interpretare un singolo indicatore come prova definitiva.",
      "Non ignorare contesto settoriale, ciclo di mercato e qualità della fonte."
    ],
    limitation:
      "L'app resta educativa. Le interpretazioni sono spiegazioni teoriche, non indicazioni personalizzate."
  },
  {
    id: "sma",
    eyebrow: "Analisi tecnica",
    title: "SMA20/SMA50 e incroci di medie mobili",
    description:
      "Le medie mobili semplici sintetizzano il prezzo medio di chiusura su finestre temporali diverse. Una media breve, come SMA20, reagisce più velocemente ai cambiamenti recenti; una media più lunga, come SMA50, descrive una tendenza più lenta.",
    theoreticalInterpretation:
      "Quando la SMA20 è superiore alla SMA50, la teoria dell'analisi tecnica interpreta normalmente la condizione come segnale di momentum recente più forte rispetto al trend intermedio. Se la SMA20 attraversa dal basso verso l'alto la SMA50, molti framework lo leggono come possibile miglioramento della struttura di trend. Se invece la SMA20 scende sotto la SMA50, viene spesso letto come indebolimento del momentum recente.",
    howToRead: [
      "SMA20 sopra SMA50: il prezzo medio recente è più alto del prezzo medio intermedio.",
      "Incrocio rialzista: il momentum recente sta superando la tendenza più lenta.",
      "Incrocio ribassista: il momentum recente sta scendendo sotto la tendenza più lenta.",
      "Maggiore distanza tra le medie: possibile trend più marcato, ma anche rischio di movimento già avanzato."
    ],
    notToConclude: [
      "Non significa automaticamente acquistare.",
      "Non predice la direzione futura.",
      "Non funziona bene in mercati laterali o molto rumorosi.",
      "Non va letto senza volume, volatilità e contesto generale."
    ],
    limitation:
      "Le medie mobili sono indicatori ritardati. Possono confermare una tendenza già in corso, ma non anticipano necessariamente l'inizio o la fine del movimento."
  },
  {
    id: "rsi",
    eyebrow: "Momentum",
    title: "RSI14",
    description:
      "RSI14 misura la forza relativa dei movimenti positivi e negativi recenti su una scala da 0 a 100. È usato per interpretare momentum e condizioni di mercato potenzialmente estese.",
    theoreticalInterpretation:
      "Nella lettura tradizionale, RSI sopra 70 viene spesso interpretato come area di forza/momentum elevato o potenziale overbought; RSI sotto 30 viene spesso interpretato come area di debolezza/momentum negativo o potenziale oversold. Tuttavia, nei trend forti RSI può restare a lungo sopra 70 o sotto 30, quindi la soglia da sola non basta per concludere che il movimento sia vicino a una inversione.",
    howToRead: [
      "RSI sopra 50: momentum recente tendenzialmente positivo.",
      "RSI sotto 50: momentum recente tendenzialmente debole.",
      "RSI sopra 70: movimento forte o potenzialmente esteso.",
      "RSI sotto 30: pressione negativa forte o potenzialmente eccessiva.",
      "Divergenza prezzo/RSI: possibile perdita di forza interna del movimento."
    ],
    notToConclude: [
      "RSI sopra 70 non significa automaticamente vendere.",
      "RSI sotto 30 non significa automaticamente comprare.",
      "RSI non misura valore fondamentale.",
      "RSI non considera news, utili, guidance o contesto macro."
    ],
    limitation:
      "RSI è più utile se letto insieme a trend, supporti/resistenze, volume e contesto di mercato."
  },
  {
    id: "relative-volume",
    eyebrow: "Volume",
    title: "Volume relativo",
    description:
      "Il volume relativo confronta il volume dell'ultima osservazione con una media recente, per capire se l'attività di scambio è superiore o inferiore alla norma storica recente.",
    theoreticalInterpretation:
      "Nella teoria dell'analisi tecnica, un movimento di prezzo accompagnato da volume superiore alla media viene spesso letto come più significativo di un movimento avvenuto con volume debole. Volume elevato può indicare maggiore partecipazione del mercato, ma non spiega da solo se la pressione sia guidata da acquisti, vendite, news, ribilanciamenti o eventi straordinari.",
    howToRead: [
      "Volume superiore alla media: seduta più partecipata rispetto al recente passato.",
      "Prezzo in aumento con volume elevato: possibile conferma della forza del movimento osservato.",
      "Prezzo in calo con volume elevato: possibile conferma della pressione negativa osservata.",
      "Volume alto senza direzione chiara: possibile fase di redistribuzione o evento non direzionale."
    ],
    notToConclude: [
      "Volume elevato non indica automaticamente direzione futura.",
      "Volume elevato non spiega la causa del movimento.",
      "Volume elevato può dipendere da eventi tecnici, ribilanciamenti o news non incluse nei dati."
    ],
    limitation:
      "Il volume va interpretato insieme a prezzo, volatilità, calendario eventi e contesto di mercato."
  },
  {
    id: "margins",
    eyebrow: "Fondamentali",
    title: "Margini e redditività",
    description:
      "I margini misurano quanto una società riesce a trasformare ricavi in profitto a diversi livelli del conto economico.",
    theoreticalInterpretation:
      "Nell'analisi fondamentale, margini superiori ai peer possono essere letti come possibile indicazione di pricing power, efficienza operativa, scala, mix prodotto favorevole o struttura costi più efficiente. Margini inferiori possono indicare pressione competitiva, costi elevati, mix sfavorevole o fase di investimento. La lettura corretta dipende però dal settore e dal modello di business.",
    howToRead: [
      "Gross margin: relazione tra ricavi e costo del venduto.",
      "Operating margin: efficienza operativa dopo costi commerciali, amministrativi e R&D.",
      "Net margin: redditività finale dopo interessi, tasse e componenti non operative.",
      "Margine sopra mediana peer: possibile vantaggio operativo o mix migliore.",
      "Margine sotto mediana peer: possibile pressione su costi, prezzi o struttura operativa."
    ],
    notToConclude: [
      "Margine alto non significa automaticamente società migliore.",
      "Margine basso non significa automaticamente società fragile.",
      "Differenze settoriali possono rendere i margini non comparabili.",
      "Eventi una tantum possono distorcere il margine."
    ],
    limitation:
      "I margini vanno letti con periodo, peer group, modello operativo e qualità contabile."
  },
  {
    id: "valuation-multiples",
    eyebrow: "Valutazione",
    title: "Multipli di mercato",
    description:
      "I multipli confrontano il valore di mercato di una società con grandezze economiche come utili, vendite, EBITDA o patrimonio netto.",
    theoreticalInterpretation:
      "Nella teoria della valutazione relativa, multipli più alti dei peer possono essere interpretati come aspettative di crescita, qualità, redditività o minore rischio percepito. Multipli più bassi possono riflettere minori aspettative, rischio più elevato, ciclicità, problemi operativi o possibile sottovalutazione relativa. La distinzione tra 'economico' e 'value trap' richiede analisi aggiuntiva.",
    howToRead: [
      "P/E: prezzo rispetto agli utili.",
      "EV/EBITDA: valore d'impresa rispetto alla redditività operativa lorda.",
      "P/S: prezzo rispetto ai ricavi, utile quando gli utili sono bassi o negativi.",
      "P/B: prezzo rispetto al patrimonio netto, più usato in settori asset-heavy o finanziari.",
      "Multiplo sopra peer: il mercato paga di più per quella metrica.",
      "Multiplo sotto peer: il mercato paga di meno per quella metrica."
    ],
    notToConclude: [
      "Multiplo basso non significa automaticamente titolo conveniente.",
      "Multiplo alto non significa automaticamente titolo caro.",
      "Utili negativi o ciclici possono rendere P/E poco informativo.",
      "Settori diversi hanno multipli strutturalmente diversi."
    ],
    limitation:
      "I multipli devono essere confrontati con crescita, margini, rischio, ciclo, qualità degli utili e peer group coerente."
  },
  {
    id: "growth",
    eyebrow: "Fondamentali",
    title: "Crescita",
    description:
      "La crescita misura la variazione nel tempo di ricavi, utili, cash flow o altre metriche operative.",
    theoreticalInterpretation:
      "Nell'analisi fondamentale, crescita superiore ai peer viene spesso letta come possibile segnale di espansione del mercato, vantaggio competitivo, innovazione, pricing power o acquisizione di quote. Tuttavia, la crescita può anche derivare da acquisizioni, inflazione, effetti valutari, recuperi ciclici o basi di confronto basse.",
    howToRead: [
      "Crescita ricavi: espansione del business top-line.",
      "Crescita utili: miglioramento della redditività netta.",
      "Crescita cash flow: capacità di trasformare risultati contabili in cassa.",
      "Crescita sopra peer: possibile migliore dinamica competitiva o esposizione a mercati più favorevoli.",
      "Crescita sotto peer: possibile maturità, pressione competitiva o fase temporanea debole."
    ],
    notToConclude: [
      "Crescita alta non significa automaticamente qualità alta.",
      "Crescita bassa non significa automaticamente deterioramento strutturale.",
      "Acquisizioni e cambi perimetro possono distorcere la crescita.",
      "Una crescita non profittevole può non creare valore."
    ],
    limitation:
      "La crescita va letta insieme a margini, investimenti, cash flow e sostenibilità del modello."
  },
  {
    id: "leverage",
    eyebrow: "Rischio finanziario",
    title: "Leva, debito e solidità",
    description:
      "Le metriche di leva misurano quanto una società dipende dal debito e quanto è sostenibile il servizio del debito.",
    theoreticalInterpretation:
      "Nell'analisi fondamentale, leva elevata viene normalmente interpretata come maggiore sensibilità a tassi, ciclo economico, calo degli utili o riduzione del cash flow. Leva bassa può indicare maggiore flessibilità finanziaria, ma anche struttura del capitale potenzialmente meno efficiente. La lettura dipende molto dal settore e dalla stabilità dei flussi di cassa.",
    howToRead: [
      "Debt to equity: rapporto tra debito e patrimonio netto.",
      "Net debt / EBITDA: anni teorici di EBITDA necessari per coprire il debito netto.",
      "Interest coverage: capacità di coprire gli interessi con il risultato operativo.",
      "Leva sopra peer: possibile rischio finanziario maggiore o strategia più aggressiva.",
      "Leva sotto peer: possibile maggiore prudenza o capacità di assorbire shock."
    ],
    notToConclude: [
      "Debito alto non è sempre negativo se i cash flow sono stabili.",
      "Debito basso non è sempre positivo se limita crescita o ritorni.",
      "La leva va letta insieme a tassi, scadenze, covenant e ciclicità."
    ],
    limitation:
      "Le metriche di leva richiedono contesto settoriale e analisi della qualità/stabilità dei flussi di cassa."
  },
  {
    id: "peer-comparison",
    eyebrow: "Peer comparison",
    title: "Interpretare lo scostamento dai peer",
    description:
      "La peer comparison confronta una metrica con aziende considerate comparabili per settore, modello operativo, dimensione o mercato.",
    theoreticalInterpretation:
      "Nella teoria dell'analisi relativa, uno scostamento positivo o negativo rispetto alla mediana peer indica che la società si colloca in modo diverso dalla distribuzione del gruppo. Questo può essere un indizio di qualità, rischio, differenza strutturale o distorsione del campione, ma non è una conclusione automatica.",
    howToRead: [
      "Sopra mediana peer: metrica più alta del riferimento centrale.",
      "Sotto mediana peer: metrica più bassa del riferimento centrale.",
      "Peer group piccolo: confronto meno robusto.",
      "Outlier: media e deviazione possono essere distorte.",
      "Periodo diverso: confronto potenzialmente non omogeneo."
    ],
    notToConclude: [
      "Sopra peer non significa automaticamente migliore.",
      "Sotto peer non significa automaticamente peggiore.",
      "Un peer group sbagliato può generare interpretazioni fuorvianti."
    ],
    limitation:
      "La peer comparison è valida solo se il peer group è coerente e il periodo di confronto è omogeneo."
  },
  {
    id: "data-quality",
    eyebrow: "Data Quality",
    title: "Prima del significato viene la qualità del dato",
    description:
      "Ogni interpretazione finanziaria dipende dalla qualità del dato sottostante.",
    theoreticalInterpretation:
      "Nella pratica analitica, un indicatore calcolato su dati incompleti, vecchi, non comparabili o non normalizzati è meno affidabile. Per questo l'app mostra source_id, fetched_at, data_as_of e completeness_score prima di spingere l'utente verso una lettura interpretativa.",
    howToRead: [
      "source_id: da dove arriva il dato.",
      "fetched_at: quando l'app lo ha recuperato.",
      "data_as_of: a quale data economica o di mercato si riferisce.",
      "completeness_score: quanto il record è completo rispetto ai campi richiesti."
    ],
    notToConclude: [
      "Non interpretare dati incompleti come definitivi.",
      "Non confrontare dati di periodi diversi senza cautela.",
      "Non ignorare ritardi dei feed o revisioni successive."
    ],
    limitation:
      "La qualità del dato non garantisce correttezza dell'interpretazione, ma riduce il rischio di interpretazioni basate su dati deboli."
  }
];

export const interpretationExamples = [
  {
    title: "Esempio SMA20/SMA50",
    bad: "La SMA20 ha superato la SMA50, quindi il titolo è da comprare.",
    good:
      "La SMA20 superiore alla SMA50 viene normalmente letta come momentum recente più forte rispetto al trend intermedio. È una condizione coerente con una lettura tecnica positiva, ma non rappresenta una raccomandazione operativa."
  },
  {
    title: "Esempio RSI",
    bad: "RSI sopra 70 significa vendere subito.",
    good:
      "RSI sopra 70 viene normalmente interpretato come momentum elevato o condizione potenzialmente estesa. Nei trend forti può restare sopra 70 a lungo, quindi va letto insieme a trend, volume e contesto."
  },
  {
    title: "Esempio margini",
    bad: "Il margine è superiore ai peer, quindi la società è migliore.",
    good:
      "Un margine superiore alla mediana peer può essere coerente con pricing power, efficienza o mix favorevole. La lettura va verificata con settore, periodo, qualità contabile e sostenibilità."
  },
  {
    title: "Esempio multipli",
    bad: "Il P/E è basso, quindi il titolo è sottovalutato.",
    good:
      "Un P/E inferiore ai peer indica che il mercato paga meno per ogni unità di utile. Può riflettere minori aspettative, rischio percepito, ciclicità o possibile disallineamento relativo. Serve analisi aggiuntiva."
  },
  {
    title: "Esempio data quality",
    bad: "Il pattern è affidabile perché è stato calcolato.",
    good:
      "Il pattern è stato calcolato sui dati disponibili e va letto insieme a source_id, data_as_of, finestra dati e completezza. Dati incompleti o vecchi riducono la qualità dell'interpretazione."
  }
];