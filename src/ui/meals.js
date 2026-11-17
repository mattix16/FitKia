// Elenco dei pasti nella home. Ogni pasto: card che apre il pannello + (se oggi è vuoto e ieri no) "Come ieri" con un tocco.
import { MEALS } from '../config.js';
import { mealTotals } from '../log.js';
import { repeatYesterday, removeFood } from '../store.js';
import { showUndo } from './toast.js';
import { formatFoodCount } from './format.js';

const fmt = new Intl.NumberFormat('it-IT');
const MEAL_ICONS = { breakfast: '☕', lunch: '🍝', dinner: '🍽️', snack: '🍎' };

export function renderMeals(container, day, yesterday = {}) {
  container.innerHTML = MEALS.map(meal => {
    const entries = day[meal.id] ?? [];
    const previous = yesterday[meal.id] ?? [];
    // I nomi degli alimenti possono essere personali (scritti dall'utente): textContent dopo, non innerHTML.
    const canRepeat = entries.length === 0 && previous.length > 0;

    return `<li class="flex flex-col gap-1.5">
      <button type="button" class="eating-button" data-meal-id="${meal.id}">
        <span aria-hidden="true" class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-tint text-lg">${MEAL_ICONS[meal.id]}</span>
        <span class="flex-1 min-w-0"><span class="block text-[15px] font-semibold">${meal.label}</span>
          <span class="mt-0.5 block truncate text-xs text-muted" data-summary-for="${meal.id}"></span>
          <span class="mt-0.5 block text-xs font-semibold tabular-nums">${fmt.format(mealTotals(day, meal.id).kcal)} <span class="font-medium text-muted">kcal</span></span></span>
        <span aria-hidden="true" class="pill-add">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M7 2v10M2 7h10"/></svg>Aggiungi</span>
      </button>
      ${canRepeat ? `<button type="button" data-repeat-meal="${meal.id}" class="chip self-start ml-2 tabular-nums"
          aria-label="Copia ${meal.label.toLowerCase()} di ieri: ${formatFoodCount(previous.length)}, ${fmt.format(mealTotals(yesterday, meal.id).kcal)} kcal">
          <span aria-hidden="true">↻</span> Come ieri · ${formatFoodCount(previous.length)} · ${fmt.format(mealTotals(yesterday, meal.id).kcal)} kcal</button>` : ''}
    </li>`;
  }).join('');

  // Riassunto con textContent: nessun nome scritto dall'utente finisce interpretato come HTML.
  MEALS.forEach(meal => {
    const entries = day[meal.id] ?? [];
    container.querySelector(`[data-summary-for="${meal.id}"]`).textContent = entries.length > 0
      ? entries.map(entry => entry.name).join(', ')
      : meal.empty;                                            // es. "Aggiungi il pranzo": invita invece di dire "vuoto"
  });
}

// Si chiama UNA volta (da main.js): un solo ascoltatore sul <ul>, che resta sempre lo stesso elemento.
export function mountMeals(container, onSelect) {
  container.addEventListener('click', event => {
    const repeat = event.target.closest('[data-repeat-meal]');
    if (repeat) {
      const mealId = repeat.dataset.repeatMeal;
      const copies = repeatYesterday(mealId);              // snapshot copiati con id nuovi: i totali si ricalcolano da soli
      const label = MEALS.find(meal => meal.id === mealId).label;
      showUndo(document.getElementById('app-toast'), `${label}: copiati ${formatFoodCount(copies.length)} di ieri`,
        () => copies.forEach(copy => removeFood(mealId, copy.id)));
      return;
    }
    const button = event.target.closest('[data-meal-id]');
    if (button) onSelect(button.dataset.mealId);
  });
}
