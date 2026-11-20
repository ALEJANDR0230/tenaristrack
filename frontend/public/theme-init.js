// Aplica el tema (claro u oscuro) antes de pintar la página. Va en un archivo propio
// para poder usar una política de seguridad (CSP) sin scripts en línea.
(function () {
  var t = null;
  try { t = localStorage.getItem('tt_theme'); } catch (e) {}
  if (!t) t = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  document.documentElement.dataset.theme = t;
})();
