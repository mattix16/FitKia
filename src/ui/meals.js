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
        <span aria-hidden="true" class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-canvas text-xl">${MEAL_ICONS[meal.id]}</span>
        <span class="flex-1 min-w-0"><span class="block text-[15px] font-bold">${meal.label}</span>
          <span class="block text-xs text-muted mt-0.5 truncate" data-summary-for="${meal.id}"></span></span>
        <span class="text-sm font-bold">${fmt.format(mealTotals(day, meal.id).kcal)} <span class="text-[11px] font-medium text-muted">kcal</span></span>
        <span aria-hidden="true" class="w-10 h-10 rounded-full bg-tint text-deep text-2xl leading-none flex items-center justify-center">+</span>
      </button>
      ${canRepeat ? `<button type="button" data-repeat-meal="${meal.id}" class="chip self-start ml-3"
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
