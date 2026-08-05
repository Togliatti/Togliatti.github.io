// Sostituisce il toggle del menu mobile (hamburger) che prima veniva
// gestito dal bundle JS di Webflow. Il CSS che gestisce l'aspetto
// (breakpoint, overlay, colori) è invariato: qui replichiamo solo
// il comportamento al click, usando lo stesso attributo/classe che
// il CSS di Webflow già si aspetta.
document.addEventListener('DOMContentLoaded', function () {
  document.querySelectorAll('.w-nav-button').forEach(function (button) {
    button.addEventListener('click', function () {
      var navbar = button.closest('.w-nav');
      var menu = navbar.querySelector('.w-nav-menu');
      var isOpen = button.classList.contains('w--open');

      if (isOpen) {
        button.classList.remove('w--open');
        menu.removeAttribute('data-nav-menu-open');
      } else {
        button.classList.add('w--open');
        menu.setAttribute('data-nav-menu-open', '');
      }
    });
  });
});