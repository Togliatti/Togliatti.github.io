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
  // vars  = (opzionale) parametri di posizionamento/font specifici di
  //         QUESTO mostro, che sovrascrivono solo i propri elementi senza
  //         toccare gli altri mostri (vedi applyVars più sotto). Se un
  //         mostro non specifica "vars", usa i valori di default definiti
  //         nel CSS (quelli del mantide originale l/l X/X).
  //         Chiavi disponibili, tutte opzionali:
  //           fontFamily          -> font-family su tutti e 4 gli elementi
  //           cornoDx.ml          -> margin-left di .corno-destro
  //           corpoX1.mt          -> margin-top di .corpo-x-1
  //           corpoX1.ml          -> margin-left di .corpo-x-1
  //           corpoX2.mt          -> margin-top di .corpo-x-2
  //           corpoX2.mr          -> margin-right di .corpo-x-2
  //           corpoX2.transform   -> transform di .corpo-x-2
  //           cornoDx.transform    -> transform di .corno-destro
  //           cornoSx.transform    -> transform di .corno-sinistro
  // Per aggiungere/togliere/riordinare un mostro basta modificare questo
  // array: l'HTML viene generato automaticamente da qui.
  var MOSTRI = [
    { sx: "l", dx: "l", c1: "X", c2: "X", ss: "ss01" }, // mantide originale
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
      vars: {
        fontFamily: "Jijoninja, sans-serif",
        cornoDx: { ml: "170px" },
        corpoX1: { mt: "-135px", ml: "-100px" },
        corpoX2: { mt: "-480px", mr: "-100px", transform: "scaleX(-1)" },
      },
    },
    // Mostro rr DD:
    {
      sx: "r",
      dx: "r",
      c1: "K",
      c2: "K",
      ss: "ss01",
      vars: {
        fontFamily: "Jijoninja, sans-serif",
        cornoDx: { ml: "50px", transform: "scaleX(-1)" },
        cornoSx: { transform: "scaleX(-1)" },
        corpoX1: { mt: "0px", ml: "-290px", fs: "35rem" },
        corpoX2: { mt: "-480px", mr: "-290px", transform: "scaleX(-1)", fs: "35rem" },
      },
    },
    // Mostro ee XX ss02:
    {
      sx: "e",
      dx: "e",
      c1: "X",
      c2: "X",
      ss: "ss02",
      vars: {
        fontFamily: "Jijoninja Variable, sans-serif",
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
      vars: {
        fontFamily: "Jijoninja Variable, sans-serif",
        cornoDx: { ml: "-40px", transform: "scaleX(-1)" },
        cornoSx: { transform: "scaleX(-1)" },
        corpoX1: { mt: "-220px" },/* 230 cattivo */
        corpoX2: { mt: "-160px" },
      },
    },
    { sx: "b", dx: "b", c1: "X", c2: "X" },
    // Mostro ww XX ss02:
    {
      sx: "w",
      dx: "w",
      c1: "X",
      c2: "X",
      ss: "ss02",
      vars: {
        fontFamily: "Jijoninja Variable, sans-serif",
        cornoDx: { ml: "40px" },
        cornoSx: { ml: "-40px" },
        corpoX1: { mt: "-320px" },/* 230 cattivo, 200 buono */
        corpoX2: { mt: "-360px" },
      },
    },
    { sx: "w", dx: "w", c1: "X", c2: "X" },
    { sx: "x", dx: "x", c1: "X", c2: "X" },
    { sx: "y", dx: "y", c1: "X", c2: "X" },
    { sx: "p", dx: "p", c1: "H", c2: "H" },
    { sx: "k", dx: "k", c1: "O", c2: "O" },
    { sx: "l", dx: "l", c1: "O", c2: "O" },
    { sx: "p", dx: "p", c1: "O", c2: "O" },
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

  // Applica i parametri opzionali di un mostro (mostro.vars) come CSS
  // custom properties inline sui SUOI elementi. Non tocca il CSS globale:
  // ogni mostro porta i propri valori sul proprio nodo DOM, quindi due
  // mostri con la stessa classe (es. .corpo-x-1) possono avere margin,
  // font, transform diversi senza collidere tra loro. Se mostro.vars è
  // assente o una chiave non è specificata, l'elemento cade sul fallback
  // definito nel CSS (--corpo-x1-mt, ecc.) e si comporta come il mostro
  // originale.
  function applyVars(container, vars) {
    if (!vars) return;

    if (vars.fontFamily) {
      LETTER_SELECTORS.forEach(function (sel) {
        var el = container.querySelector(sel);
        if (el) el.style.setProperty("--mostro-font", vars.fontFamily);
      });
    }

    var cornoDx = container.querySelector(".corno-destro");
    if (cornoDx && vars.cornoDx) {
      if (vars.cornoDx.ml != null) {
        cornoDx.style.setProperty("--corno-dx-ml", vars.cornoDx.ml);
      }
      // Nota: cornoDx.transform non è un custom property CSS, ma viene
      // comunque applicato inline come style.transform, così da poter
      // speculare il corno destro senza toccare il CSS globale.
      if (vars.cornoDx.transform != null) {
        cornoDx.style.setProperty("--corno-dx-transform", vars.cornoDx.transform);
      }
    }

    var cornoSx = container.querySelector(".corno-sinistro");
    if (cornoSx && vars.cornoSx) {
      if (vars.cornoSx.transform != null) {
        cornoSx.style.setProperty("--corno-sx-transform", vars.cornoSx.transform);
      }
    }

    var corpoX1 = container.querySelector(".corpo-x-1");
    if (corpoX1 && vars.corpoX1) {
      if (vars.corpoX1.mt != null) {
        corpoX1.style.setProperty("--corpo-x1-mt", vars.corpoX1.mt);
      }
      if (vars.corpoX1.ml != null) {
        corpoX1.style.setProperty("--corpo-x1-ml", vars.corpoX1.ml);
      }
      if (vars.corpoX1.fs != null) {
        corpoX1.style.setProperty("--corpo-x1-fs", vars.corpoX1.fs);
      }
    }

    var corpoX2 = container.querySelector(".corpo-x-2");
    if (corpoX2 && vars.corpoX2) {
      if (vars.corpoX2.mt != null) {
        corpoX2.style.setProperty("--corpo-x2-mt", vars.corpoX2.mt);
      }
      if (vars.corpoX2.mr != null) {
        corpoX2.style.setProperty("--corpo-x2-mr", vars.corpoX2.mr);
      }
      if (vars.corpoX2.transform != null) {
        corpoX2.style.setProperty("--corpo-x2-transform", vars.corpoX2.transform);
      }
      if (vars.corpoX2.fs != null) {
        corpoX2.style.setProperty("--corpo-x2-fs", vars.corpoX2.fs);
      }
    }
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

    container.appendChild(oriz);
    container.appendChild(vert);

    applyVars(container, mostro.vars);

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

  function init() {
    buildMonsters();

    var containers = document.querySelectorAll("[data-mostro-id]");
    containers.forEach(function (container) {
      var inst = makeInstance(container);
      if (inst) instances.push(inst);
    });

    if (instances.length === 0) return;

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
