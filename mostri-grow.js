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

  // Elenco dei mostri da comporre, nell'ordine in cui appaiono in pagina.
  // sx/dx = lettere delle corna (flex-oriz-mantide)
  // c1/c2 = lettere del corpo (flex-vert-mantide)
  // Per aggiungere/togliere/riordinare un mostro basta modificare questo
  // array: l'HTML viene generato automaticamente da qui.
  var MOSTRI = [
    { sx: "l", dx: "l", c1: "X", c2: "X" }, // mantide originale
    { sx: "p", dx: "p", c1: "X", c2: "X" },
    { sx: "z", dx: "z", c1: "X", c2: "X" },
    { sx: "a", dx: "a", c1: "X", c2: "X" }, // TODO: provare size più piccola
    { sx: "b", dx: "b", c1: "X", c2: "X" },
    { sx: "d", dx: "d", c1: "X", c2: "X" },
    { sx: "n", dx: "n", c1: "X", c2: "X" },
    { sx: "m", dx: "m", c1: "X", c2: "X" },
    { sx: "o", dx: "o", c1: "X", c2: "X" },
    { sx: "t", dx: "t", c1: "X", c2: "X" },
    { sx: "w", dx: "w", c1: "X", c2: "X" },
    { sx: "x", dx: "x", c1: "X", c2: "X" },
    { sx: "y", dx: "y", c1: "X", c2: "X" },
    { sx: "p", dx: "p", c1: "H", c2: "H" },
    { sx: "d", dx: "d", c1: "H", c2: "H" },
    { sx: "d", dx: "d", c1: "M", c2: "M" },
    { sx: "k", dx: "k", c1: "O", c2: "O" },
    { sx: "l", dx: "l", c1: "O", c2: "O" },
    { sx: "t", dx: "t", c1: "O", c2: "O" },
    { sx: "p", dx: "p", c1: "O", c2: "O" },
    { sx: "v", dx: "v", c1: "O", c2: "O" },
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

  // Costruisce il markup di un mostro con le stesse classi/struttura
  // usate finora, così la CSS esistente (allineamenti, sticky, ecc.)
  // continua a funzionare senza modifiche.
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

    var c1 = document.createElement("div");
    c1.className = "corpo-x-1";
    c1.textContent = mostro.c1;

    var c2 = document.createElement("div");
    c2.className = "corpo-x-2";
    c2.textContent = mostro.c2;

    vert.appendChild(c1);
    vert.appendChild(c2);

    container.appendChild(oriz);
    container.appendChild(vert);

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
    var vh = window.innerHeight;

    // Finché la base del mostro non tocca il fondo del viewport, magro.
    if (rect.bottom > vh) return 0;

    // rect.top nel momento esatto in cui il mostro è appena tutto visibile
    // (base a filo col fondo del viewport). Da qui in poi ingrassa.
    var entryTop = vh - rect.height;
    if (entryTop <= 0) return 1; // mostro più alto del viewport: già a fondo scala

    var progress = (entryTop - rect.top) / entryTop;
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
