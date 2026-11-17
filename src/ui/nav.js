// Evidenzia nella tab bar la voce della vista attiva (e dice agli screen reader qual è la pagina corrente).
// Come in iOS: la voce attiva cambia solo COLORE (accento), il peso del testo resta uguale; il riempimento
// leggero dell'icona lo applica il CSS leggendo aria-current, senza stato duplicato nel JS.
const ACTIVE = ['text-deep'];
const IDLE = ['text-muted'];

export function renderNav(view) {
  document.querySelectorAll('[data-nav]').forEach(link => {
    const active = link.dataset.nav === view;
    if (active) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
    ACTIVE.forEach(c => link.classList.toggle(c, active));
    IDLE.forEach(c => link.classList.toggle(c, !active));
  });
}
