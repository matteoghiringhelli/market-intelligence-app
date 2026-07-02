export const interpretationGuideSections = [
  {
    id: "principles",
    eyebrow: "Principi generali",
    title: "Come leggere l'app",
    description:
      "La Market Intelligence App mostra dati descrittivi, tracciabili e contestualizzati. Non interpreta i dati come raccomandazioni, non assegna giudizi buy/sell e non suggerisce azioni operative.",
    bullets: [
      "Ogni dato va letto insieme a fonte, data di riferimento e completezza.",
      "Un valore fuori norma non significa automaticamente opportunità o rischio.",
      "Un pattern tecnico descrive una condizione osservata sullo storico, non una previsione.",
      "Un confronto fondamentale dipende dalla qualità del peer group e dal periodo contabile scelto."
    ],
    limitation:
      "La lettura corretta è sempre comparativa e descrittiva. Nessun singolo indicatore dovrebbe essere interpretato isolatamente."
  },
  {
    id: "technical-patterns",
    eyebrow: "Pattern tecnici",
    title: "Come interpretare i pattern tecnici",
    description:
      "I pattern tecnici rilevati dall'app sono condizioni matematiche osservate sui prezzi o sui volumi storici. Servono a descrivere cosa è successo nella serie dati, non a prevedere cosa succederà.",
    bullets: [
      "SMA20/SMA50: confronta una media mobile breve con una più lunga per descrivere la relazione tra tendenza recente e tendenza più ampia.",
      "RSI14: sintetizza il momentum recente su 14 periodi e indica se il movimento osservato è sopra o sotto alcune soglie descrittive.",
      "Volume relativo: confronta il volume dell'ultima osservazione con la media recente per evidenziare sedute con attività superiore alla norma.",
      "Finestra dati: indica il periodo usato per il calcolo. Una finestra più corta può essere più sensibile ma anche più rumorosa."
    ],
    limitation:
      "I pattern tecnici sono indicatori ritardati o descrittivi. Non indicano probabilità, direzione futura, ampiezza del movimento o convenienza operativa."
  },
  {
    id: "fundamentals",
    eyebrow: "Fondamentali",
    title: "Come interpretare i fondamentali",
    description:
      "I fondamentali aiutano a descrivere la struttura economica e finanziaria di una società. La loro lettura richiede periodo, formula, fonte, completezza e confronto con un peer group coerente.",
    bullets: [
      "Margini: descrivono la relazione tra ricavi e costi. Vanno confrontati con aziende simili per settore e modello operativo.",
      "Crescita: misura la variazione di una metrica nel tempo, ma può essere influenzata da acquisizioni, cambi perimetro o effetti non ricorrenti.",
      "Multipli: confrontano valore di mercato e grandezze economiche, ma possono essere distorti da utili negativi, eventi straordinari o differenze contabili.",
      "Leva e debito: descrivono struttura finanziaria e rischio di bilancio, ma vanno letti insieme a cash flow, settore e ciclo economico."
    ],
    limitation:
      "Un fondamentale superiore o inferiore alla mediana peer non implica automaticamente qualità, sottovalutazione o sopravvalutazione."
  },
  {
    id: "peer-comparison",
    eyebrow: "Peer comparison",
    title: "Come leggere il confronto con i peer",
    description:
      "Il confronto con i peer serve a capire se una metrica è sopra, sotto o vicina alla distribuzione di aziende comparabili. La qualità del confronto dipende dalla definizione del peer group.",
    bullets: [
      "Peer group piccolo: meno osservazioni rendono il confronto meno robusto.",
      "Settore/industria: aziende in settori diversi possono avere margini e multipli strutturalmente non comparabili.",
      "Periodo: confrontare periodi diversi può introdurre distorsioni.",
      "Outlier: poche aziende estreme possono spostare media e deviazioni."
    ],
    limitation:
      "La peer comparison è utile per contestualizzare, non per classificare automaticamente un titolo come migliore o peggiore."
  },
  {
    id: "data-quality",
    eyebrow: "Data Quality",
    title: "Perché qualità e fonte contano",
    description:
      "Prima di interpretare un numero è necessario sapere da dove arriva, quando è stato aggiornato, che periodo rappresenta e quanto è completo.",
    bullets: [
      "source_id: identifica la fonte del dato.",
      "fetched_at: indica quando l'app ha recuperato il dato.",
      "data_as_of: indica la data economica o di mercato rappresentata dal dato.",
      "completeness_score: aiuta a capire se il record contiene tutti i campi necessari."
    ],
    limitation:
      "Dati incompleti, ritardati o non normalizzati devono essere letti con maggiore cautela."
  }
];

export const interpretationExamples = [
  {
    title: "Esempio pattern tecnico",
    bad: "Il titolo è da comprare perché la SMA20 ha superato la SMA50.",
    good:
      "La SMA20 risulta superiore alla SMA50 nell'ultima osservazione disponibile. La condizione descrive una relazione tra medie mobili, ma non indica una previsione o una raccomandazione operativa."
  },
  {
    title: "Esempio fondamentale",
    bad: "Il titolo è sottovalutato perché ha un margine superiore ai peer.",
    good:
      "Il margine osservato è superiore alla mediana del peer group nel periodo considerato. La differenza va letta insieme a settore, modello operativo, campione peer, periodo e completezza del dato."
  },
  {
    title: "Esempio data quality",
    bad: "Il dato è sicuramente aggiornato.",
    good:
      "Il dato è stato recuperato alla data indicata da fetched_at e rappresenta il periodo indicato da data_as_of. Eventuali ritardi o incompletezze vanno considerati nell'interpretazione."
  }
];