import { validateProfile } from '../validation.js';
import { GOAL_OPTIONS, ACTIVITY_OPTIONS, DEFAULT_SETTINGS } from '../config.js';
import { fillOptions } from './forms.js';

// Markup richiesto: <form id="onboarding-form" novalidate> con input/select name="name|age|weightKg|heightCm|sex|goal|activity"
// e, sotto ogni campo, <p data-error-for="age" role="alert" class="text-sm text-red-700"></p>
export function mountOnboarding(form, onValid) {
  fillOptions(form.elements.goal, GOAL_OPTIONS, DEFAULT_SETTINGS.goal);
  fillOptions(form.elements.activity, ACTIVITY_OPTIONS, DEFAULT_SETTINGS.activity);
  form.addEventListener('submit', event => {
    event.preventDefault();
    const raw = Object.fromEntries(new FormData(form));
    const { ok, errors, value } = validateProfile(raw);
    showErrors(form, errors);
    if (ok) onValid(value);
  });
}

function showErrors(form, errors) {
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