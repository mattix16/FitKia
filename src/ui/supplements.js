import { LIMITS } from '../config.js';
import { validateSupplementName } from '../validation.js';
import { getState, addSupplementItem, deleteSupplement, toggleSupplement } from '../store.js';
import { isChecked } from '../habits.js';
import { todayKey } from '../log.js';
import { escapeHtml as esc } from './forms.js';

const $ = id => document.getElementById(id);

export function mountSupplements() {
  const form = $('supplement-form');
  form.elements.name.maxLength = LIMITS.supplementName.max; // il limite vive in config.js, non nell'HTML
  form.addEventListener('submit', event => {
    event.preventDefault();
    const existing = getState().habits.supplements.map(s => s.name);
    const { ok, errors, value } = validateSupplementName(Object.fromEntries(new FormData(form)), existing);
    $('supplement-error').textContent = errors.name ?? '';
    if (!ok) return;
    addSupplementItem(value.name);
    form.reset();
  });
  const list = $('supplements-list');
  list.addEventListener('change', event => {
    if (event.target.matches('[data-supplement-id]')) toggleSupplement(event.target.dataset.supplementId);
  });
  list.addEventListener('click', event => {
    const button = event.target.closest('[data-remove-id]');
    if (button) deleteSupplement(button.dataset.removeId);
  });
}

export function renderSupplements(state) {
  const today = todayKey();
  // I nomi li scrive l'utente: SEMPRE escapeHtml prima di metterli in innerHTML.
  $('supplements-list').innerHTML = state.habits.supplements.map(({ id, name }) => {
    const done = isChecked(state.habits, today, id);
    return `<li class="flex items-center gap-3 rounded-2xl bg-canvas px-4 py-2.5">
      <label class="flex min-w-0 flex-1 items-center gap-3">
        <input type="checkbox" data-supplement-id="${esc(id)}" ${done ? 'checked' : ''} class="h-5 w-5 accent-emerald-600">
        <span class="truncate text-sm ${done ? 'text-muted line-through' : ''}">${esc(name)}</span>
      </label>
      <button type="button" data-remove-id="${esc(id)}" aria-label="Rimuovi ${esc(name)}" class="h-9 w-9 rounded-full bg-tint text-deep">✕</button></li>`;
  }).join('') || '<li class="text-sm text-muted">Nessun integratore: aggiungine uno qui sotto.</li>';
}
