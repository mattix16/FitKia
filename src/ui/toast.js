import { escapeHtml } from './forms.js';

let timer;

/** Messaggio breve con "Annulla" dentro `container` (un elemento role="status"). Sparisce da solo dopo `ms`.
 *  Sta DENTRO la finestra e non in un elemento fisso della pagina: una <dialog> modale copre tutto il resto. */
export function showUndo(container, message, onUndo, ms = 5000) {
  clearTimeout(timer);
  container.innerHTML = `<span class="flex-1">${escapeHtml(message)}</span>
    <button type="button" data-undo class="font-bold text-deep underline">Annulla</button>`;
  container.querySelector('[data-undo]').addEventListener('click', () => {
    clearTimeout(timer);
    container.textContent = '';
    onUndo();
  }, { once: true });
  timer = setTimeout(() => { container.textContent = ''; }, ms);
}
