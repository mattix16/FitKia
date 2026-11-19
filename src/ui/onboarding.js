import { validateProfile } from '../validation.js';
import { GOAL_OPTIONS, ACTIVITY_OPTIONS, SEX_OPTIONS, DEFAULT_SETTINGS } from '../config.js';
import { fillChoices, showFieldErrors } from './forms.js';
import { describeTargets } from './format.js';

const $ = id => document.getElementById(id);

/** Riepilogo subito dopo "Salva e inizia": i target appena calcolati (stessa stringa di Impostazioni). Tutti testi nostri o numeri. */
function showWelcome(profile) {
  const goal = GOAL_OPTIONS.find(option => option.id === profile.goal)?.label ?? '';
  const activity = ACTIVITY_OPTIONS.find(option => option.id === profile.activity)?.label.toLowerCase() ?? '';
  $('welcome-summary').textContent = `${goal} · attività: ${activity}`;
  $('welcome-targets').textContent = describeTargets(profile);
  $('welcome-dialog').showModal();
}

// Markup richiesto: <form id="onboarding-form" novalidate> con input name="name|age|weightKg|heightCm", tre <div> vuoti (onboarding-sex,
// onboarding-goal, onboarding-activity) che qui si riempiono di schede con radio name="sex|goal|activity" e, sotto ogni campo,
// <p data-error-for="age" role="alert" class="text-sm text-danger"></p>
export function mountOnboarding(form, onValid) {
  fillChoices($('onboarding-sex'), 'sex', SEX_OPTIONS, undefined, 'segmented');   // nessuna scelta iniziale: se manca, la validazione lo dice
  fillChoices($('onboarding-goal'), 'goal', GOAL_OPTIONS, DEFAULT_SETTINGS.goal);
  fillChoices($('onboarding-activity'), 'activity', ACTIVITY_OPTIONS, DEFAULT_SETTINGS.activity);
  $('welcome-close').addEventListener('click', () => $('welcome-dialog').close());
  form.addEventListener('submit', event => {
    event.preventDefault();
    const raw = Object.fromEntries(new FormData(form));
    const { ok, errors, value } = validateProfile(raw);
    showFieldErrors(form, errors);
    if (ok) {
      onValid(value);                                      // salva: la home appare dietro...
      showWelcome(value);                                  // ...e sopra c'è il riepilogo del piano
    }
  });
}
