/* Trial Slideshow — self-contained vanilla JS carousel
   Works on any .trial-slideshow-wrapper found on the page (0, 1, or many).
   CSS: see "CUSTOM: Trial Slideshow" block in situ-novu.webflow.shared.404d2b72d.css
*/
(function () {
  function initSlideshow(wrapper) {
    const box = wrapper.querySelector(".trial-slideshow");
    const mask = wrapper.querySelector(".trial-slideshow-mask");
    const nav = wrapper.querySelector(".trial-slideshow-nav");
    if (!box || !mask || !nav) return;

    const delayMs = 4000; // stesso data-delay dello slider originale

    // Slide reali (prima di aggiungere i cloni)
    const originalSlides = Array.from(mask.children);
    const total = originalSlides.length;
    if (total === 0) return;

    // Clono l'ultima slide all'inizio e la prima slide alla fine:
    // così la sequenza fisica diventa [clone-ultima, 1,2,3,4,5,6, clone-prima]
    // e il "giro" avanti/indietro può continuare nella stessa direzione
    // invece di riavvolgersi visivamente all'indietro.
    const firstClone = originalSlides[0].cloneNode(true);
    const lastClone = originalSlides[total - 1].cloneNode(true);
    mask.insertBefore(lastClone, originalSlides[0]);
    mask.appendChild(firstClone);

    const extendedTotal = total + 2;
    let position = 1; // partiamo sulla prima slide reale (indice 1 nella sequenza estesa)
    let autoplayTimer;
    let isDragging = false;
    let startX = 0;
    let deltaX = 0;
    let isLocked = false;
    let lockTimer = null;
    let wrapTimer = null;

    // Blocca ogni nuova interazione (swipe, click sui dot, autoplay)
    // finché la transizione in corso (+ l'eventuale scatto sul clone)
    // non si è del tutto assestata. Niente più corse contro il tempo:
    // semplicemente, finché l'immagine si sta ancora muovendo, non si
    // può swipare di nuovo.
    function lock() {
      isLocked = true;
      clearTimeout(lockTimer);
      lockTimer = setTimeout(() => {
        isLocked = false;
      }, 520); // durata della transizione (500ms) + margine di sicurezza
    }

    // Costruisco i pallini di navigazione (uno per ogni slide reale)
    originalSlides.forEach((_, index) => {
      const dot = document.createElement("div");
      dot.className = "trial-slideshow-dot" + (index === 0 ? " active" : "");
      dot.addEventListener("click", () => {
        if (isLocked) return;
        setPosition(index + 1, true);
        restartAutoplay();
      });
      nav.appendChild(dot);
    });

    function logicalIndex(pos) {
      if (pos <= 0) return total - 1;
      if (pos >= extendedTotal - 1) return 0;
      return pos - 1;
    }

    function updateDots(index) {
      nav.querySelectorAll(".trial-slideshow-dot").forEach((dot, i) => {
        dot.classList.toggle("active", i === index);
      });
    }

    function setPosition(pos, animate) {
      position = pos;
      if (animate) {
        mask.classList.remove("no-transition");
        lock();
      } else {
        mask.classList.add("no-transition");
      }
      mask.style.transform = "translateX(-" + position * 100 + "%)";
      updateDots(logicalIndex(position));
      if (!animate) {
        // Forzo un reflow prima di riabilitare la transizione, altrimenti
        // il browser potrebbe animare anche questo salto istantaneo.
        void mask.offsetWidth;
        mask.classList.remove("no-transition");
      }

      // Se la nuova posizione atterra su un clone, programmo lo scatto
      // silenzioso verso la slide reale corrispondente con un timer,
      // NON con l'evento "transitionend": quest'ultimo non scatta se una
      // nuova interazione (es. un nuovo swipe) interrompe la transizione
      // in corso, lasciando la posizione bloccata su un clone e mandando
      // il carosello fuori dai binari con schermate grigie e blocchi.
      clearTimeout(wrapTimer);
      if (animate && (position === extendedTotal - 1 || position === 0)) {
        const landedOnLast = position === extendedTotal - 1;
        wrapTimer = setTimeout(() => {
          if (landedOnLast && position === extendedTotal - 1) {
            setPosition(1, false);
          } else if (!landedOnLast && position === 0) {
            setPosition(extendedTotal - 2, false);
          }
        }, 520); // poco più della durata della transizione (500ms)
      }
    }

    function nextSlide() {
      if (isLocked) return;
      setPosition(position + 1, true);
    }

    function prevSlide() {
      if (isLocked) return;
      setPosition(position - 1, true);
    }

    function restartAutoplay() {
      clearInterval(autoplayTimer);
      autoplayTimer = setInterval(nextSlide, delayMs);
    }

    // --- Trascinamento con mouse e dito (Pointer Events copre entrambi) ---
    function setDragTransform(px) {
      mask.style.transform =
        "translateX(calc(-" + position * 100 + "% + " + px + "px))";
    }

    box.addEventListener("pointerdown", (e) => {
      e.preventDefault(); // impedisce al browser di avviare una selezione testo/immagine
      if (isLocked) return; // niente nuovo swipe finché la slide non si è assestata
      isDragging = true;
      startX = e.clientX;
      deltaX = 0;
      box.classList.add("dragging");
      mask.classList.add("no-transition");
      clearInterval(autoplayTimer);
      box.setPointerCapture(e.pointerId);
    });

    box.addEventListener("pointermove", (e) => {
      if (!isDragging) return;
      deltaX = e.clientX - startX;
      setDragTransform(deltaX);
    });

    function endDrag() {
      if (!isDragging) return;
      isDragging = false;
      box.classList.remove("dragging");
      mask.classList.remove("no-transition");

      const threshold = box.clientWidth * 0.15;
      if (deltaX <= -threshold) {
        nextSlide();
      } else if (deltaX >= threshold) {
        prevSlide();
      } else {
        setPosition(position, true);
      }
      restartAutoplay();
    }

    box.addEventListener("pointerup", endDrag);
    box.addEventListener("pointercancel", endDrag);
    box.addEventListener("pointerleave", () => {
      if (isDragging) endDrag();
    });

    // Imposto esplicitamente il transform sulla prima slide reale, senza
    // transizione (siamo al caricamento). Vale ancora la correzione per
    // Safari: un valore di transform esplicito, invece di quello di
    // default assente, evita il bug del mancato render iniziale.
    setPosition(1, false);
    restartAutoplay();
  }

  window.addEventListener("load", function () {
    document
      .querySelectorAll(".trial-slideshow-wrapper")
      .forEach(initSlideshow);
  });
})();
