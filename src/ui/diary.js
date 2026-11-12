import { MEALS } from '../config.js';
import { mealTotals } from '../log.js';

const fmt = new Intl.NumberFormat('it-IT');

export function renderMeals(container, day) {
  container.innerHTML = MEALS.map(meal => {
    const entries = day[meal.id] ?? [];
    const summary = entries.length > 0
      ? entries.map(entry => entry.name).join(', ')
      : 'Nessun alimento aggiunto';

    return `<li><button type="button" class="eating-button" data-meal-id="${meal.id}">
      <span class="flex-1 min-w-0"><span class="block text-[15px] font-bold">${meal.label}</span>
        <span class="block text-xs text-muted mt-0.5 truncate">${summary}</span></span>
      <span class="text-sm font-bold">${fmt.format(mealTotals(day, meal.id).kcal)} <span class="text-[11px] font-medium text-muted">kcal</span></span>
      <span aria-hidden="true" class="w-11 h-11 rounded-full bg-tint text-deep text-2xl leading-none flex items-center justify-center">+</span>
    </button></li>`;
  }).join('');
}

// Si chiama UNA volta (da main.js): un solo ascoltatore sul <ul>, che resta sempre lo stesso elemento.
export function mountMeals(container, onSelect) {
  container.addEventListener('click', event => {
    const button = event.target.closest('[data-meal-id]');
    if (button) onSelect(button.dataset.mealId);
  });
}