import { WEIGHT_HISTORY_SHOWN } from '../config.js';
import { validateWeightInput } from '../validation.js';
import { logWeight, deleteWeight } from '../store.js';
import { weightHistory } from '../habits.js';
import { escapeHtml as esc } from './forms.js';
import { formatDecimal, formatShortDate, formatSigned } from './format.js';

const $ = id => document.getElementById(id);

export function mountWeight() {
  const form = $('weight-form');
  form.addEventListener('submit', event => {
    event.preventDefault();
    const { ok, errors, value } = validateWeightInput(Object.fromEntries(new FormData(form)));
    $('weight-error').textContent = errors.weightKg ?? '';
    if (!ok) return;
    logWeight(value.weightKg);
    form.reset();
  });
  $('weight-list').addEventListener('click', event => {
    const button = event.target.closest('[data-weight-date]');
    if (button) deleteWeight(button.dataset.weightDate);
  });
}

export function renderWeight(state) {
  const rows = weightHistory(state.habits, WEIGHT_HISTORY_SHOWN);
  $('weight-list').innerHTML = rows.map(({ date, kg, delta }) => `<li class="flex items-center gap-3 rounded-2xl bg-canvas px-4 py-2.5">
      <span class="flex-1 text-sm text-muted">${formatShortDate(date)}</span>
      ${delta === null ? '' : `<span class="text-xs text-muted">${formatSigned(delta)} kg</span>`}
      <span class="text-sm font-bold">${formatDecimal(kg)} kg</span>
      <button type="button" data-weight-date="${esc(date)}" aria-label="Rimuovi il peso del ${formatShortDate(date)}" class="h-9 w-9 rounded-full bg-tint text-deep">✕</button></li>`
  ).join('') || '<li class="text-sm text-muted">Nessun peso registrato.</li>';
}
