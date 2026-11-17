import { validateProfile } from '../validation.js';
import { GOAL_OPTIONS, ACTIVITY_OPTIONS, DEFAULT_SETTINGS } from '../config.js';
import { fillOptions, showFieldErrors } from './forms.js';

// Markup richiesto: <form id="onboarding-form" novalidate> con input/select name="name|age|weightKg|heightCm|sex|goal|activity"
// e, sotto ogni campo, <p data-error-for="age" role="alert" class="text-sm text-danger"></p>
export function mountOnboarding(form, onValid) {
  fillOptions(form.elements.goal, GOAL_OPTIONS, DEFAULT_SETTINGS.goal);
  fillOptions(form.elements.activity, ACTIVITY_OPTIONS, DEFAULT_SETTINGS.activity);
  form.addEventListener('submit', event => {
    event.preventDefault();
    const raw = Object.fromEntries(new FormData(form));
    const { ok, errors, value } = validateProfile(raw);
    showFieldErrors(form, errors);
    if (ok) onValid(value);
  });
}
