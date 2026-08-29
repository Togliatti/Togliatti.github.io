/**
 * Mostri Jijoninja — ingrassamento scroll-driven
 * Ricostruzione vanilla JS delle interazioni Webflow IX2 originali
 * ("Mantide Grow" su MOUSE_Y e "Scrolla la mantide" su SCROLL_PROGRESS),
 * unificate qui in un'unica logica valida su tutti i device.
 *
 * Comportamento:
 * - Ogni mostro (contenitore .container-mantide con data-mostro-id) resta
 *   "magro" (wght 100) finché non è interamente visibile, cioè finché la
 *   sua base non tocca il fondo del viewport.
 * - Da quel momento ingrassa progressivamente (fino a wght 900) man mano
 *   che sale verso la cima, restando "grasso" quando le corna stanno per
 *   uscire dal bordo superiore.
 * - I mostri vengono generati automaticamente dall'array MOSTRI qui sotto
 *   dentro il contenitore #mostri-wrapper presente in pagina: per
 *   aggiungere, togliere o riordinare un mostro basta modificare l'array,
 *   non serve toccare l'HTML.
 * - Ogni mostro è indipendente dagli altri: la formula usa solo la
 *   posizione del proprio contenitore, quindi funziona per N mostri
 *   impaginati uno sotto l'altro senza bisogno di configurazione extra.
 * - Nessuna distinzione desktop/mobile: la stessa logica di scroll vale
 *   ovunque, la CSS esistente (es. position: sticky sotto i 991px)
 *   si occupa del resto.
 *
 * Nota: rimuove la necessità dei vecchi data-w-id sugli elementi lettera
 * (corno-sinistro, corno-destro, corpo-x-1, corpo-x-2): se sono ancora
 * presenti in HTML, il motore IX2 di Webflow continuerebbe a scrivere
 * font-variation-settings in parallelo a questo script, creando conflitti.
 */

(function () {
  "use strict";

  // Peso minimo (Thin) e massimo (BigBoldone) dell'asse variabile.
  var WGHT_MIN = 100;
  var WGHT_MAX = 900;

  // Variante stilistica (ss01, ss02, ss03, ...) da applicare al corpo (c1/c2)
  // quando un mostro non ne specifica una propria via "ss".
  var DEFAULT_SS = "ss01";

  // Elenco dei mostri da comporre, nell'ordine in cui appaiono in pagina.
  // sx/dx = lettere delle corna (flex-oriz-mantide)
  // c1/c2 = lettere del corpo (flex-vert-mantide)
  // ss    = (opzionale) variante stilistica del corpo, es. "ss03";
  //         se omessa si usa DEFAULT_SS ("ss01").
  // varsDesktop = parametri di posizionamento/font di QUESTO mostro validi
  //         di default (desktop e in generale ovunque non venga
  //         sovrascritto da varsMobile). Se un mostro non specifica
  //         "varsDesktop", usa i valori di fallback definiti nel CSS
  //         (quelli del mantide originale l/l X/X).
  // varsMobile = (opzionale) parametri validi SOLO sotto i 479px
  //         (vedi MOBILE_QUERY più sotto), che sovrascrivono, chiave per
  //         chiave, i corrispondenti valori di varsDesktop. Se una chiave
  //         non è specificata in varsMobile, quell'elemento eredita il
  //         valore di varsDesktop anche sotto i 479px (non torna al
  //         fallback CSS). Se un mostro non specifica affatto
  //         "varsMobile", sotto i 479px eredita integralmente
  //         varsDesktop: niente più valori "presi in prestito" dal
  //         mantide originale come accadeva quando questi valori erano
  //         hardcoded nel CSS.
  //         Chiavi disponibili in entrambi gli oggetti, tutte opzionali:
  //           fontFamily          -> font-family su tutti e 4 gli elementi
  //           cornoSx.mt          -> margin-top di .corno-sinistro
  //           cornoSx.ml          -> margin-left di .corno-sinistro
  //           cornoSx.fs          -> font-size di .corno-sinistro
  //           cornoSx.lh          -> line-height di .corno-sinistro
  //                                  (essendo il corno ruotato, questo
  //                                  sposta l'elemento in orizzontale, non
  //                                  in verticale)
  //           cornoSx.transform   -> transform aggiuntivo di .corno-sinistro
  //                                  (si somma alla rotazione base, non la
  //                                  sostituisce: usarlo per scaleX(-1))
  //           cornoDx.mt          -> margin-top di .corno-destro
  //           cornoDx.ml          -> margin-left di .corno-destro
  //           cornoDx.fs          -> font-size di .corno-destro
  //           cornoDx.lh          -> line-height di .corno-destro (idem sopra)
  //           cornoDx.transform   -> transform aggiuntivo di .corno-destro
  //           corpoX1.mt          -> margin-top di .corpo-x-1
  //           corpoX1.ml          -> margin-left di .corpo-x-1
  //           corpoX1.fs          -> font-size di .corpo-x-1
  //           corpoX1.lh          -> line-height di .corpo-x-1
  //           corpoX1.transform   -> transform di .corpo-x-1
  //           corpoX2.mt          -> margin-top di .corpo-x-2
  //           corpoX2.mr          -> margin-right di .corpo-x-2
  //           corpoX2.fs          -> font-size di .corpo-x-2
  //           corpoX2.lh          -> line-height di .corpo-x-2
  //           corpoX2.transform   -> transform di .corpo-x-2
  // Per aggiungere/togliere/riordinare un mostro basta modificare questo
  // array: l'HTML viene generato automaticamente da qui.
  var MOSTRI = [
    {
      sx: "l",
      dx: "l",
      c1: "X",
      c2: "X",
      ss: "ss01", // mantide originale
      // Niente varsMobile: prima riproduceva a mano i valori mobile
      // hardcoded nel vecchio CSS (font-size ridotto, margini
      // ricalcolati), ma con .mostro-scale-wrapper che ora usa "zoom"
      // (non "transform: scale") il rimpicciolimento sotto i breakpoint
      // è automatico e proporzionalmente corretto per tutti i mostri,
      // mantide compreso — niente più bisogno di una riduzione manuale
      // duplicata (che tra l'altro sommandosi allo zoom lo rendeva
      // eccessivamente piccolo).
      varsDesktop: {
        fontFamily: "Jijoninja Stronzo, sans-serif",
      },
    },
    // Mostro ll AA Il ginnico che fa compassione
    {
      sx: "l",
      dx: "l",
      c1: "A",
      c2: "A",
      ss: "ss01",
      // Mostro "ridicolo": disegnato con Jijoninja non-variable (swash
      // capitals), quindi il font è statico e l'ingrassamento via scroll
      // non avrà effetto visivo su questi 4 elementi finché non esisterà
      // una versione variable del font con le swash (in lavorazione in
      // Glyphs). Nel frattempo il mostro resta fermo sul disegno statico.
      // Il font originale è "Jijoninja Variable"
      varsDesktop: {
        fontFamily: "Jijoninja Stronzo, sans-serif",
        cornoDx: { ml: "170px" },
        corpoX1: { mt: "-135px", ml: "-100px" },
        corpoX2: { mt: "-480px", mr: "-100px", transform: "scaleX(-1)" },
      },
    },
    // Mostro rr KK Quello che incute un leggero timore:
    {
      sx: "r",
      dx: "r",
      c1: "K",
      c2: "K",
      ss: "ss01",
      varsDesktop: {
        fontFamily: "Jijoninja Stronzo, sans-serif",
        cornoDx: { ml: "50px", transform: "scaleX(-1)" },
        cornoSx: { transform: "scaleX(-1)" },
        corpoX1: { mt: "50px", ml: "-390px", fs: "35rem" },
        corpoX2: { mt: "-480px", mr: "-390px", transform: "scaleX(-1)", fs: "35rem" },
      },
    },
    // Mostro ee XX ss02:
    {
      sx: "e",
      dx: "e",
      c1: "X",
      c2: "X",
      ss: "ss02",
      varsDesktop: {
        fontFamily: "Jijoninja Stronzo, sans-serif",
        cornoDx: { ml: "-35px", transform: "scaleX(-1)" },
        cornoSx: { transform: "scaleX(-1)" },
        corpoX1: { mt: "-90px" },
        corpoX2: { mt: "-300px" },
      },
    },
    // Mostro dd XX ss02:
    {
      sx: "p",
      dx: "p",
      c1: "X",
      c2: "X",
      ss: "ss02",
      varsDesktop: {
        fontFamily: "Jijoninja Stronzo, sans-serif",
        cornoDx: { ml: "-40px", transform: "scaleX(-1)" },
        cornoSx: { transform: "scaleX(-1)" },
        corpoX1: { mt: "-220px" },/* 230 cattivo */
        corpoX2: { mt: "-160px" },
      },
    },
    
    // Mostro ww XX ss02:
    {
      sx: "w",
      dx: "w",
      c1: "X",
      c2: "X",
      ss: "ss02",
      varsDesktop: {
        fontFamily: "Jijoninja Stronzo, sans-serif",
        cornoDx: { ml: "30px" },
        cornoSx: { ml: "0px" },
        corpoX1: { mt: "-320px" },
        corpoX2: { mt: "-360px" },
      },
    },
    // Mostro xx XX ss02:
    {
      sx: "x",
      dx: "x",
      c1: "X",
      c2: "X",
      ss: "ss02",
      varsDesktop: {
        fontFamily: "Jijoninja Stronzo, sans-serif",
        cornoDx: { ml: "20px", fs: "35rem" },
        cornoSx: { ml: "0px", fs: "35rem" },
        corpoX1: { mt: "-220px" },
        corpoX2: { mt: "-340px" },
      },
    },
    // Mostro xx XX ss01 Lo smile:
    {
      sx: "s",
      dx: "s",
      c1: "O",
      c2: "O",
      ss: "ss01",
      varsDesktop: {
        fontFamily: "Jijoninja Stronzo, sans-serif",
        cornoDx: { ml: "-35px", mt: "0px", fs: "35rem" },
        cornoSx: { ml: "0px", mt: "0px", fs: "35rem" },
        corpoX1: { mt: "-290px" },
        corpoX2: { mt: "-480px", transform: "scaleX(-1)" },
      },
    },
    // Mostro yy XX il gatto:
    {
      sx: "y",
      dx: "y",
      c1: "T",
      c2: "T",
      ss: "ss01",
      varsDesktop: {
        fontFamily: "Jijoninja Stronzo, sans-serif",
        cornoDx: { ml: "-80px", fs: "35rem" },
        cornoSx: { ml: "0px", fs: "35rem" },
        corpoX1: { mt: "-120px", ml: "130px", transform: "scaleX(-1)" },
        corpoX2: { mt: "-480px" },
      },
    },
    // Mostro cc HH il culturista:
    {
      sx: "c",
      dx: "c",
      c1: "H",
      c2: "H",
      ss: "ss01",
      varsDesktop: {
        fontFamily: "Jijoninja Stronzo, sans-serif",
        cornoDx: { ml: "-300px", fs: "35rem", transform: "scaleX(-1)" },
        cornoSx: { ml: "0px", fs: "35rem", transform: "scaleX(-1)" },
        corpoX1: { mt: "10px", ml: "270px", transform: "scaleX(-1)" },
        corpoX2: { mt: "-480px" },
      },
    },
    //Mostro uu UU uuuuuuuuuuhhhhhhhhh!!!!!!
    {
      sx: "u",
      dx: "u",
      c1: "U",
      c2: "U",
      ss: "ss01",
      varsDesktop: {
        fontFamily: "Jijoninja Stronzo, sans-serif",
        cornoDx: { ml: "-70px", fs: "35rem" },
        cornoSx: { ml: "0px", fs: "35rem" },
        corpoX1: { mt: "-100px", ml: "-323px", fs: "35rem" },
        corpoX2: { mt: "-480px", mr: "-323px", transform: "scaleX(-1)", fs: "35rem" },
      },
    },
    {
      sx: "e",
      dx: "e",
      c1: "Y",
      c2: "Y",
      ss: "ss03",
      varsDesktop: {
        fontFamily: "Jijoninja Stronzo, sans-serif",
        cornoDx: { ml: "0px", fs: "35rem", transform: "scaleX(-1)" },
        cornoSx: { ml: "0px", fs: "35rem", transform: "scaleX(-1)" },
        corpoX1: { mt: "0px", ml: "0px", transform: "scaleX(-1)" },
        corpoX2: { mt: "-300px" },
      },
    },
  ];

  // Selettori dei 4 elementi-lettera dentro ogni mostro.
  var LETTER_SELECTORS = [
    ".corno-sinistro",
    ".corno-destro",
    ".corpo-x-1",
    ".corpo-x-2",
  ];

  // Quanto è "morbido" l'assestamento elastico verso il peso target.
  // Stesso valore usato in graphic-disegn-scroll.js per coerenza.
  var LERP_FACTOR = 0.2;

  var instances = [];

  // --- Scala uniforme a 3 breakpoint --------------------------------
  // Rimpicciolisce l'INTERO mostro (corna + corpo insieme) con
  // transform: scale(), applicato su un wrapper che avvolge entrambi.
  // A differenza di mt/ml/fs, che agiscono PRIMA dell'impaginazione (e
  // quindi vanno ricalibrati mostro per mostro), scale agisce DOPO: che
  // il mostro sia stato costruito con questo o quel margin-left non ha
  // importanza, si rimpicciolisce comunque in blocco, proporzioni
  // comprese. Serve quindi UN SOLO fattore di scala per breakpoint, non
  // uno per mostro (eccezioni puntuali per i mostri più larghi si
  // gestiscono comunque a parte, con mt/ml, come deciso).
  // Valori di partenza, da ricalibrare guardando il mostro più largo a
  // ciascuna soglia:
  var SCALE_BREAKPOINTS = [
    { query: window.matchMedia("(max-width: 479px)"), scale: 0.55 },
    { query: window.matchMedia("(max-width: 767px)"), scale: 0.7 },
    { query: window.matchMedia("(max-width: 991px)"), scale: 0.85 },
  ];

  // Ordine dal più stretto al più largo: il primo che corrisponde vince
  // (sotto i 479px anche "max-width: 767px" risulta vero, ma non deve
  // prevalere sul valore pensato apposta per il mobile).
  function getCurrentScale() {
    for (var i = 0; i < SCALE_BREAKPOINTS.length; i++) {
      if (SCALE_BREAKPOINTS[i].query.matches) return SCALE_BREAKPOINTS[i].scale;
    }
    return 1;
  }

  // Riapplica il fattore di scala corrente al wrapper di ogni mostro già
  // costruito. Chiamata all'avvio e ogni volta che uno dei tre breakpoint
  // viene attraversato, in entrambe le direzioni.
  function applyResponsiveScale() {
    var scale = getCurrentScale();
    var wrappers = document.querySelectorAll(".mostro-scale-wrapper");
    wrappers.forEach(function (wrapper) {
      wrapper.style.setProperty("--mostro-scale", scale);
    });
  }
  // --------------------------------------------------------------------

  // Sotto questa soglia si applicano i valori di varsMobile al posto (o
  // in aggiunta) di varsDesktop. È lo stesso oggetto matchMedia usato
  // come primo scalino di SCALE_BREAKPOINTS, così la soglia dei 479px
  // vive in un solo posto.
  var MOBILE_QUERY = SCALE_BREAKPOINTS[0].query;

  // Unisce due gruppi di parametri (es. varsDesktop.corpoX1 e
  // varsMobile.corpoX1): per ogni chiave presente in "override" quel
  // valore vince, altrimenti si mantiene quello di "base". Se "override"
  // è assente, il risultato è semplicemente "base" (eredita tutto).
  function mergeGroup(base, override) {
    var result = {};
    var key;
    if (base) {
      for (key in base) {
        if (base.hasOwnProperty(key)) result[key] = base[key];
      }
    }
    if (override) {
      for (key in override) {
        if (override.hasOwnProperty(key)) result[key] = override[key];
      }
    }
    return result;
  }

  // Calcola i parametri effettivi di un mostro per il breakpoint corrente:
  // fuori dal mobile è semplicemente varsDesktop; sotto i 479px ogni
  // gruppo (cornoSx, cornoDx, corpoX1, corpoX2) viene unito con l'eventuale
  // corrispondente gruppo in varsMobile, chiave per chiave.
  function getEffectiveVars(mostro, isMobile) {
    var desktop = mostro.varsDesktop || {};
    if (!isMobile) return desktop;

    var mobile = mostro.varsMobile || {};
    return {
      fontFamily: mobile.fontFamily != null ? mobile.fontFamily : desktop.fontFamily,
      cornoSx: mergeGroup(desktop.cornoSx, mobile.cornoSx),
      cornoDx: mergeGroup(desktop.cornoDx, mobile.cornoDx),
      corpoX1: mergeGroup(desktop.corpoX1, mobile.corpoX1),
      corpoX2: mergeGroup(desktop.corpoX2, mobile.corpoX2),
    };
  }

  // Imposta una custom property se il valore è specificato, altrimenti la
  // rimuove esplicitamente. Necessario per attraversare i breakpoint in
  // entrambe le direzioni: senza la remove, un valore scritto per il
  // mobile restava appiccicato inline anche tornando sopra i 479px
  // (bug: serviva un refresh per tornare "normale").
  function setOrRemove(el, prop, value) {
    if (value != null) {
      el.style.setProperty(prop, value);
    } else {
      el.style.removeProperty(prop);
    }
  }

  // Applica i parametri effettivi (già uniti in base al breakpoint) come
  // CSS custom properties inline sui 4 elementi-lettera del mostro. Non
  // tocca il CSS globale: ogni mostro porta i propri valori sul proprio
  // nodo DOM, quindi due mostri con la stessa classe (es. .corpo-x-1)
  // possono avere margin, font, transform diversi senza collidere tra
  // loro. Ogni proprietà viene sempre impostata O rimossa (mai lasciata
  // "come stava prima"), così il risultato è identico indipendentemente
  // da quale fosse il breakpoint precedente.
  function applyVars(container, vars) {
    vars = vars || {};

    LETTER_SELECTORS.forEach(function (sel) {
      var el = container.querySelector(sel);
      if (el) setOrRemove(el, "--mostro-font", vars.fontFamily);
    });

    var cornoSx = container.querySelector(".corno-sinistro");
    if (cornoSx) {
      var vSx = vars.cornoSx || {};
      setOrRemove(cornoSx, "--corno-sx-mt", vSx.mt);
      setOrRemove(cornoSx, "--corno-sx-ml", vSx.ml);
      setOrRemove(cornoSx, "--corno-sx-fs", vSx.fs);
      setOrRemove(cornoSx, "--corno-sx-lh", vSx.lh);
      // Nota: cornoSx/cornoDx.transform non sono custom property CSS
      // "pure" in senso stretto, ma vengono comunque applicate così, e
      // si SOMMANO alla rotazione base già presente nel CSS (non la
      // sostituiscono): usarle per scaleX(-1), non per rotazioni diverse.
      setOrRemove(cornoSx, "--corno-sx-transform", vSx.transform);
    }

    var cornoDx = container.querySelector(".corno-destro");
    if (cornoDx) {
      var vDx = vars.cornoDx || {};
      setOrRemove(cornoDx, "--corno-dx-mt", vDx.mt);
      setOrRemove(cornoDx, "--corno-dx-ml", vDx.ml);
      setOrRemove(cornoDx, "--corno-dx-fs", vDx.fs);
      setOrRemove(cornoDx, "--corno-dx-lh", vDx.lh);
      setOrRemove(cornoDx, "--corno-dx-transform", vDx.transform);
    }

    var corpoX1 = container.querySelector(".corpo-x-1");
    if (corpoX1) {
      var vX1 = vars.corpoX1 || {};
      setOrRemove(corpoX1, "--corpo-x1-mt", vX1.mt);
      setOrRemove(corpoX1, "--corpo-x1-ml", vX1.ml);
      setOrRemove(corpoX1, "--corpo-x1-fs", vX1.fs);
      setOrRemove(corpoX1, "--corpo-x1-lh", vX1.lh);
      setOrRemove(corpoX1, "--corpo-x1-transform", vX1.transform);
    }

    var corpoX2 = container.querySelector(".corpo-x-2");
    if (corpoX2) {
      var vX2 = vars.corpoX2 || {};
      setOrRemove(corpoX2, "--corpo-x2-mt", vX2.mt);
      setOrRemove(corpoX2, "--corpo-x2-mr", vX2.mr);
      setOrRemove(corpoX2, "--corpo-x2-fs", vX2.fs);
      setOrRemove(corpoX2, "--corpo-x2-lh", vX2.lh);
      setOrRemove(corpoX2, "--corpo-x2-transform", vX2.transform);
    }
  }

  // Ricalcola e riapplica i parametri effettivi (desktop o mobile a
  // seconda del breakpoint corrente) su TUTTI i mostri già costruiti.
  // Chiamata all'avvio e ogni volta che MOBILE_QUERY viene attraversata.
  function applyResponsiveVars() {
    var isMobile = MOBILE_QUERY.matches;
    var containers = document.querySelectorAll("[data-mostro-id]");
    containers.forEach(function (container) {
      var index = parseInt(container.getAttribute("data-mostro-id"), 10) - 1;
      var mostro = MOSTRI[index];
      if (!mostro) return;
      applyVars(container, getEffectiveVars(mostro, isMobile));
    });
  }

  // Costruisce il markup di un mostro con le stesse classi/struttura
  // usate finora, così la CSS esistente continua a funzionare senza modifiche.
  function buildMonsterEl(mostro, index) {
    var container = document.createElement("div");
    container.className = "container-mantide";
    container.setAttribute("data-mostro-id", index + 1);

    var oriz = document.createElement("div");
    oriz.className = "w-layout-hflex flex-oriz-mantide";

    var sx = document.createElement("div");
    sx.className = "corno-sinistro";
    sx.textContent = mostro.sx;

    var dx = document.createElement("div");
    dx.className = "corno-destro";
    dx.textContent = mostro.dx;

    oriz.appendChild(sx);
    oriz.appendChild(dx);

    var vert = document.createElement("div");
    vert.className = "w-layout-vflex flex-vert-mantide";

    var ss = mostro.ss || DEFAULT_SS;
    var featureSettings = '"' + ss + '" 1';

    var c1 = document.createElement("div");
    c1.className = "corpo-x-1";
    c1.textContent = mostro.c1;
    c1.style.fontFeatureSettings = featureSettings;

    var c2 = document.createElement("div");
    c2.className = "corpo-x-2";
    c2.textContent = mostro.c2;
    c2.style.fontFeatureSettings = featureSettings;

    vert.appendChild(c1);
    vert.appendChild(c2);

    // Wrapper su cui applicare transform: scale() ai breakpoint stretti.
    // Avvolge corna+corpo insieme così si rimpiccioliscono in blocco,
    // mantenendo le proporzioni relative qualunque sia la costruzione
    // interna del mostro (vedi SCALE_BREAKPOINTS/applyResponsiveScale).
    var scaleWrapper = document.createElement("div");
    scaleWrapper.className = "mostro-scale-wrapper";
    scaleWrapper.appendChild(oriz);
    scaleWrapper.appendChild(vert);

    container.appendChild(scaleWrapper);

    return container;
  }

  function buildMonsters() {
    var wrapper = document.getElementById("mostri-wrapper");
    if (!wrapper) return;

    MOSTRI.forEach(function (mostro, index) {
      wrapper.appendChild(buildMonsterEl(mostro, index));
    });
  }

  function isVisible(el) {
    return el.offsetParent !== null;
  }

  // 0 = il mostro non è ancora interamente visibile (bordo inferiore
  //     non ha ancora toccato il fondo del viewport) -> resta magro
  // 1 = il mostro sta per uscire dal bordo superiore (grasso)
  function computeRawProgress(container) {
    var rect = container.getBoundingClientRect();
    var vh = window.innerHeight+100; /*mostri più alti di 100vh, quindi consideriamo il fondo del viewport 100px più in basso*/

    // Finché la base del mostro non tocca il fondo del viewport, magro.
    if (rect.bottom > vh) return 0;

    // rect.top nel momento esatto in cui il mostro è appena tutto visibile
    // (base a filo col fondo del viewport). Da qui in poi ingrassa.
    var entryTop = vh - rect.height;
    if (entryTop <= 0) return 1; // mostro più alto del viewport: già a fondo scala

    var topOffset = 100; /*consideriamo il bordo superiore del viewport 100px più in alto, così il mostro ingrassa prima di uscire*/
    var progress = (entryTop - rect.top) / (entryTop - topOffset);
    if (progress < 0) progress = 0;
    if (progress > 1) progress = 1;
    return progress;
  }

  function makeInstance(container) {
    var letters = [];
    LETTER_SELECTORS.forEach(function (sel) {
      var el = container.querySelector(sel);
      if (el) letters.push(el);
    });
    if (letters.length === 0) return null;

    return {
      container: container,
      letters: letters,
      current: WGHT_MIN, // peso interpolato attualmente applicato
      target: WGHT_MIN, // peso verso cui si sta muovendo
    };
  }

  // Registra un listener di cambio breakpoint compatibile anche con
  // Safari < 14 (che non supporta addEventListener su MediaQueryList).
  function onBreakpointChange(mq, fn) {
    if (typeof mq.addEventListener === "function") {
      mq.addEventListener("change", fn);
    } else if (typeof mq.addListener === "function") {
      mq.addListener(fn);
    }
  }

  function init() {
    buildMonsters();
    applyResponsiveVars();
    applyResponsiveScale();

    var containers = document.querySelectorAll("[data-mostro-id]");
    containers.forEach(function (container) {
      var inst = makeInstance(container);
      if (inst) instances.push(inst);
    });

    if (instances.length === 0) return;

    // Quando si attraversa la soglia dei 479px (es. rotazione del device,
    // o resize della finestra su desktop), ricalcola i parametri di TUTTI
    // i mostri passando da varsDesktop a varsMobile o viceversa.
    onBreakpointChange(MOBILE_QUERY, applyResponsiveVars);

    // La scala invece va ricalcolata ad OGNI attraversamento di uno dei
    // tre breakpoint (479/767/991), in entrambe le direzioni: restringere
    // e riallargare la finestra deve sempre lasciare il fattore corretto,
    // mai un valore rimasto appiccicato dal breakpoint precedente.
    SCALE_BREAKPOINTS.forEach(function (bp) {
      onBreakpointChange(bp.query, applyResponsiveScale);
    });

    window.addEventListener("scroll", updateTargets, { passive: true });
    window.addEventListener("resize", updateTargets);
    updateTargets();
    requestAnimationFrame(tick);
  }

  function updateTargets() {
    instances.forEach(function (inst) {
      if (!isVisible(inst.container)) return;
      var progress = computeRawProgress(inst.container);
      inst.target = WGHT_MIN + progress * (WGHT_MAX - WGHT_MIN);
    });
  }

  function tick() {
    instances.forEach(function (inst) {
      if (!isVisible(inst.container)) return;

      inst.current += (inst.target - inst.current) * LERP_FACTOR;

      if (Math.abs(inst.target - inst.current) < 0.5) {
        inst.current = inst.target;
      }

      var wghtValue = "'wght' " + inst.current.toFixed(1);
      inst.letters.forEach(function (letter) {
        letter.style.fontVariationSettings = wghtValue;
      });
    });

    requestAnimationFrame(tick);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
