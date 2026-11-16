// Piccole utilità per i form, condivise da più schermate.

/** Riempie una <select> da un array di { id, label, hint? } e seleziona `selectedId`.
 *  new Option(testo, valore) crea le voci senza innerHTML: il testo non viene mai interpretato come HTML. */
export function fillOptions(select, options, selectedId) {
  select.replaceChildren(...options.map(({ id, label, hint }) => {
    const option = new Option(hint ? `${label} — ${hint}` : label, id);
    option.selected = id === selectedId;
    return option;
  }));
}

/** Neutralizza i caratteri speciali: obbligatoria per OGNI testo scelto dall'utente (o da un'API) messo in innerHTML. */
export const escapeHtml = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const timers = new WeakMap();
/** Mostra un messaggio breve (es. "Salvato") in un elemento role="status" e lo cancella dopo `ms`. */
export function flashStatus(el, text, ms = 2500) {
  clearTimeout(timers.get(el));
  el.textContent = text;
  timers.set(el, setTimeout(() => { el.textContent = ''; }, ms));
}

/** Mostra gli errori di validazione sotto ogni campo (<p data-error-for="nome">) e porta il focus sul primo sbagliato. */
export function showFieldErrors(form, errors) {
  let firstInvalidInput = null;

  // Cicliamo solo sui paragrafi, gestendo sia il testo che l'input associato
  form.querySelectorAll('p[data-error-for]').forEach(p => {
    const fieldName = p.getAttribute('data-error-for');
    const input = form.querySelector(`[name="${fieldName}"]`);
    
    // Estraiamo il messaggio e creiamo il tuo booleano
    const message = errors[fieldName];
    const hasError = Boolean(message);

   // 1. Aggiorniamo il testo: se c'è un errore mostriamo il messaggio, altrimenti lo svuotiamo
    if (hasError) {
      p.textContent = message;
    } else {
      p.textContent = "";
    }
    // 2. Aggiorniamo l'input se esiste
    if (input) {
      input.setAttribute('aria-invalid', String(hasError));
      
      // 3. Salviamo il primo per il focus
      if (hasError && !firstInvalidInput) {
        firstInvalidInput = input;
      }
    }
  });

  // UX: Focus automatico
  if (firstInvalidInput) {
    firstInvalidInput.focus();
  }
}