// Evidenzia nella barra in basso la voce della vista attiva (e dice agli screen reader qual è la pagina corrente).
const ACTIVE = ['text-deep', 'font-bold'];
const IDLE = ['text-muted', 'font-semibold'];

export function renderNav(view) {
  document.querySelectorAll('[data-nav]').forEach(link => {
    const active = link.dataset.nav === view;
    if (active) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
    ACTIVE.forEach(c => link.classList.toggle(c, active));
    IDLE.forEach(c => link.classList.toggle(c, !active));
  });
}
