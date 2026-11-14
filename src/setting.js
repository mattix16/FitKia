// Pagina Impostazioni. Come foodPanel: mount (eventi, UNA volta) e render (aggiorna la vista, tante volte).
import { GOAL_OPTIONS, ACTIVITY_OPTIONS } from '../config.js';
import { calculateTargets } from '../nutrition.js';
import { validateGoalSettings } from '../validation.js';
import { updateProfile } from '../store.js';
import { fillOptions } from './forms.js';

const $ = id => document.getElementById(id);
const fmt = new Intl.NumberFormat('it-IT');

export function mountSettings() {
  const form = $('goal-form');
  form.addEventListener('submit', event => {
    event.preventDefault();
    const { ok, errors, value } = validateGoalSettings(Object.fromEntries(new FormData(form)));
    $('goal-error').textContent = errors.goal ?? errors.activity ?? '';
    if (!ok) return;
    updateProfile(value); // lo store salva e notifica: la dashboard si ricalcola da sola
    // TODO: Mattia, conferma all'utente: scrivi "Salvato" in #goal-status (è un role="status": lo legge lo screen reader)
    //       e fallo sparire dopo un paio di secondi con setTimeout.
  });

  // TODO: Mattia, anteprima: quando l'utente cambia una <select> (evento 'change') mostra l'obiettivo in kcal
  //       che risulterebbe, SENZA salvare. Ti servono calculateTargets e il profilo corrente (getState().profile).
}

/** Riallinea le select ai valori salvati. */
export function renderSettings(state) {
  const form = $('goal-form');
  fillOptions(form.elements.goal, GOAL_OPTIONS, state.profile.goal);
  fillOptions(form.elements.activity, ACTIVITY_OPTIONS, state.profile.activity);
  const target = calculateTargets(state.profile)[state.profile.goal];
  $('goal-current').textContent = `Obiettivo giornaliero attuale: ${fmt.format(target)} kcal`;
}