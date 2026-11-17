import { escapeHtml } from './forms.js';

const timers = new WeakMap(); // un timer per contenitore: il toast della home non cancella quello del pannello

/** Messaggio breve con "Annulla" dentro `container` (un elemento role="status"). Sparisce da solo dopo `ms`.
 *  Nel pannello alimenti sta DENTRO la finestra: una <dialog> modale copre tutto il resto della pagina. */
export function showUndo(container, message, onUndo, ms = 5000) {
  clearTimeout(timers.get(container));
  container.innerHTML = `<span class="animate-toast flex-1">${escapeHtml(message)}</span>
    <button type="button" data-undo class="min-h-9 px-1 font-bold text-deep underline">Annulla</button>`;
  container.querySelector('[data-undo]').addEventListener('click', () => {
    clearTimeout(timers.get(container));
    container.textContent = '';
    onUndo();
  }, { once: true });
  timers.set(container, setTimeout(() => { container.textContent = ''; }, ms));
}
