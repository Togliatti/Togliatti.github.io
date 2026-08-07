/**
 * Graphic Disegn — scroll-linked text animation
 * Ricostruzione vanilla JS dell'interazione Webflow IX2 originale
 * (eventType: SCROLLING_IN_VIEW, action: TRANSFORM_MOVE, smoothing: 80)
 *
 * Comportamento:
 * - Il testo entra "incollato" al bordo superiore dell'immagine quando
 *   quest'ultima appare dal basso del viewport.
 * - Scorre linearmente verso il basso, in proporzione allo scroll, fino a
 *   restare "incollato" al bordo inferiore quando l'immagine esce dall'alto.
 * - Quando lo scroll si ferma, il testo non scatta di colpo alla posizione
 *   finale ma la raggiunge con un leggero assestamento elastico (lerp).
 *
 * Funziona su tutti i breakpoint senza bisogno di replicare le media query:
 * anima soltanto l'elemento che la tua CSS esistente rende visibile
 * (div-disegn-desk / div-disegn-cell-v / div-disegn-pad).
 */

(function () {
  "use strict";

  // Valori esatti recuperati dalla config Webflow (keyframe 100 = yValue)
  var TARGETS = [
    { selector: ".div-disegn-desk", distance: 657 },
    { selector: ".div-disegn-cell-v", distance: 338 },
    { selector: ".div-disegn-pad", distance: 461 },
  ];

  // Quanto è "morbido" l'assestamento elastico.
  // Più alto = più lag/elastico, più basso = più secco/immediato.
  // Corrisponde concettualmente allo smoothing:80 di Webflow, ma è
  // un'approssimazione: il motore IX2 originale non è in questo file,
  // quindi regola pure questo valore a occhio se non ti sembra identico.
  var LERP_FACTOR = 0.12;

  var instances = [];

  function isVisible(el) {
    // Rispetta la tua CSS: un elemento nascosto via display:none
    // (o dentro un parent nascosto) ha offsetParent === null.
    return el.offsetParent !== null;
  }

  function computeRawProgress(el) {
    var rect = el.getBoundingClientRect();
    var vh = window.innerHeight;
    // 0  -> bordo superiore dell'elemento appena entrato dal fondo viewport
    // 1  -> bordo inferiore dell'elemento appena uscito dalla cima viewport
    var progress = (vh - rect.top) / (vh + rect.height);
    if (progress < 0) progress = 0;
    if (progress > 1) progress = 1;
    return progress;
  }

  function makeInstance(config) {
    var el = document.querySelector(config.selector);
    if (!el) return null;

    return {
      el: el,
      distance: config.distance,
      current: 0, // valore interpolato (px) attualmente applicato
      target: 0, // valore verso cui si sta muovendo (px)
    };
  }

  function init() {
    TARGETS.forEach(function (config) {
      var inst = makeInstance(config);
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
      if (!isVisible(inst.el)) return;
      var progress = computeRawProgress(inst.el);
      inst.target = progress * inst.distance;
    });
  }

  function tick() {
    instances.forEach(function (inst) {
      if (!isVisible(inst.el)) return;

      // Assestamento elastico: si avvicina al target ad ogni frame
      // invece di scattarci sopra istantaneamente.
      inst.current += (inst.target - inst.current) * LERP_FACTOR;

      // Evita numeri residui infinitesimali che sprecano cicli di rendering
      if (Math.abs(inst.target - inst.current) < 0.05) {
        inst.current = inst.target;
      }

      inst.el.style.transform = "translateY(" + inst.current.toFixed(2) + "px)";
    });

    requestAnimationFrame(tick);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
