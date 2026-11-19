// Piccole utilità per i form, condivise da più schermate.

/** Neutralizza i caratteri speciali: obbligatoria per OGNI testo scelto dall'utente (o da un'API) messo in innerHTML. */
export const escapeHtml = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/**
 * Scelta singola a schede, al posto della <select> di sistema (su Android è una lista grigia che non somiglia all'app).
 * Sono radio VERI (stesso `name`): FormData, validazione e tastiera restano quelli di sempre; il radio è nascosto con sr-only (non con hidden:
 * resterebbe fuori dal Tab) dentro un'etichetta che fa da scheda. Restituisce il markup come testo: pura, quindi si prova senza DOM.
 * @param {string} name nome del campo (es. "activity")
 * @param {{ id: string | number, label: string, hint?: string }[]} options come GOAL_OPTIONS, ACTIVITY_OPTIONS...
 * @param {string | number | undefined} selectedId l'opzione scelta (undefined = nessuna)
 * @param {'list' | 'segmented'} [variant] 'list' = schede in colonna con la descrizione; 'segmented' = pulsanti affiancati, solo l'etichetta
 */
export function choiceMarkup(name, options, selectedId, variant = 'list') {
  return options.map(({ id, label, hint }) => {
    const input = `<input type="radio" name="${escapeHtml(name)}" value="${escapeHtml(id)}" class="sr-only"${id === selectedId ? ' checked' : ''}>`;
    if (variant === 'segmented') return `<label class="choice">${input}<span>${escapeHtml(label)}</span></label>`;
    return `<label class="choice">${input}<span class="min-w-0 flex-1"><span class="block text-[15px] font-semibold">${escapeHtml(label)}</span>`
      + `${hint ? `<span class="block text-xs text-muted">${escapeHtml(hint)}</span>` : ''}</span>`
      + '<span class="choice-mark" aria-hidden="true"><svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 8.5l3 3 6-6.5"/></svg></span></label>';
  }).join('');
}

/** Disegna le schede dentro `container` (un <div> vuoto dentro un <fieldset> con la sua <legend>). Una volta sola: dopo si usa setChoice. */
export function fillChoices(container, name, options, selectedId, variant = 'list') {
  container.className = variant === 'segmented' ? 'segmented' : 'flex flex-col gap-2';
  container.innerHTML = choiceMarkup(name, options, selectedId, variant);
}

/** Sceglie il valore di un gruppo di schede senza ridisegnarle (`form.elements[name]` è la lista dei suoi radio). Un valore che non c'è non cambia nulla. */
export function setChoice(form, name, value) {
  form.elements[name].value = String(value);
}

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