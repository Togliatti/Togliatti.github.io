document.addEventListener('DOMContentLoaded', function() {
  var links = document.querySelectorAll('.menutext');
  var salvato = sessionStorage.getItem('menuAttivo');

  // 1. Salva quale link è stato cliccato
  links.forEach(function(link) {
    link.addEventListener('click', function() {
      sessionStorage.setItem('menuAttivo', link.getAttribute('href'));
    });
  });

  // 2. Forza l'assegnazione dello stile scavalcando Webflow (Compatibile al 100% con Safari)
  function applicaStileAttivo() {
    links.forEach(function(link) {
      var href = link.getAttribute('href');
      
      if (href === salvato || window.location.pathname.endsWith(href)) {
        // Applica le tue modifiche CSS via codice in modo forzato con !important
        link.style.setProperty('color', '#000', 'important');
        link.style.setProperty('line-height', '20px', 'important');
        link.style.setProperty('border-bottom', '5px solid #80294f6c', 'important');
        link.style.setProperty('padding-bottom', '20px', 'important');
        
        // Risolve il bug del rendering grafico di Safari
        link.offsetHeight; 
      } else {
        // Rimuove lo stile se non è la pagina corrente
        link.style.removeProperty('color');
        link.style.removeProperty('line-height');
        link.style.removeProperty('border-bottom');
        link.style.removeProperty('padding-bottom');
      }
    });
  }

  // Esegui subito e ripeti dopo un attimo per fregare il controllo di Webflow
  applicaStileAttivo();
  setTimeout(applicaStileAttivo, 100);
});
