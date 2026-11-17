// Tab bar "Liquid Glass": evidenzia la voce della vista attiva (e dice agli screen reader qual è la pagina corrente)
// e fa scivolare la lente di vetro sotto di lei. La posizione la fa il CSS (--nav-index); qui si sceglie solo l'indice.
const ACTIVE = ['text-deep'];
const IDLE = ['text-muted'];

let lastIndex = null;

export function renderNav(view) {
  const links = [...document.querySelectorAll('[data-nav]')];
  links.forEach(link => {
    const active = link.dataset.nav === view;
    if (active) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
    ACTIVE.forEach(c => link.classList.toggle(c, active));
    IDLE.forEach(c => link.classList.toggle(c, !active));
  });

  const index = links.findIndex(link => link.dataset.nav === view);
  const tabs = document.getElementById('nav-tabs');
  const lens = document.getElementById('nav-lens');
  if (!tabs || !lens || index === -1 || index === lastIndex) return;
  tabs.style.setProperty('--nav-index', String(index));
  // La lente si "allunga" mentre si sposta, come una goccia; al primo render nessuna animazione.
  if (lastIndex !== null) {
    lens.classList.remove('is-moving');
    void lens.offsetWidth;            // riavvia l'animazione CSS
    lens.classList.add('is-moving');
  }
  lastIndex = index;
}
