// Elenco dei pasti nella home. Ogni pasto: card che apre il pannello + (se il giorno è vuoto e quello prima no) "Come ieri" con un tocco.
// Su un giorno passato "ieri" diventa "il giorno prima" (si copia dal giorno precedente a quello mostrato).
import { MEALS } from '../config.js';
import { mealTotals } from '../log.js';
import { repeatPreviousDay, removeFood, getViewedDay, isViewingToday } from '../store.js';
import { showUndo } from './toast.js';
import { formatFoodCount } from './format.js';
import { toneIcon } from './icons.js';

const fmt = new Intl.NumberFormat('it-IT');

export function renderMeals(container, day, yesterday = {}, { isToday = true } = {}) {
  const dayBefore = isToday ? 'ieri' : 'il giorno prima';
  container.innerHTML = MEALS.map(meal => {
    const entries = day[meal.id] ?? [];
    const previous = yesterday[meal.id] ?? [];
    // I nomi degli alimenti possono essere personali (scritti dall'utente): textContent dopo, non innerHTML.
    const canRepeat = entries.length === 0 && previous.length > 0;

    return `<li class="flex flex-col gap-1.5">
      <button type="button" class="eating-button" data-meal-id="${meal.id}">
        ${toneIcon(meal.id)}
        <span class="flex-1 min-w-0"><span class="block text-[15px] font-semibold">${meal.label}</span>
          <span class="mt-0.5 line-clamp-2 text-xs text-muted" data-summary-for="${meal.id}"></span>
          <span class="mt-0.5 block text-xs font-semibold tabular-nums">${fmt.format(mealTotals(day, meal.id).kcal)} <span class="font-medium text-muted">kcal</span></span></span>
        <span aria-hidden="true" class="pill-add">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M7 2v10M2 7h10"/></svg>Aggiungi</span>
      </button>
      ${canRepeat ? `<button type="button" data-repeat-meal="${meal.id}" class="chip self-start ml-2 tabular-nums"
          aria-label="Copia ${meal.label.toLowerCase()} di ${dayBefore}: ${formatFoodCount(previous.length)}, ${fmt.format(mealTotals(yesterday, meal.id).kcal)} kcal">
          <span aria-hidden="true">↻</span> Come ${dayBefore} · ${formatFoodCount(previous.length)} · ${fmt.format(mealTotals(yesterday, meal.id).kcal)} kcal</button>` : ''}
    </li>`;
  }).join('');

  // Riassunto con textContent: nessun nome scritto dall'utente finisce interpretato come HTML.
  MEALS.forEach(meal => {
    const entries = day[meal.id] ?? [];
    container.querySelector(`[data-summary-for="${meal.id}"]`).textContent = entries.length > 0
      ? entries.map(entry => `${entry.name} (${entry.grams} g)`).join(', ')   // es. "Yogurt greco 0% (200 g), Fiocchi d'avena (50 g)"
      : meal.empty;                                            // es. "Aggiungi il pranzo": invita invece di dire "vuoto"
  });
}

// Si chiama UNA volta (da main.js): un solo ascoltatore sul <ul>, che resta sempre lo stesso elemento.
export function mountMeals(container, onSelect) {
  container.addEventListener('click', event => {
    const repeat = event.target.closest('[data-repeat-meal]');
    if (repeat) {
      const mealId = repeat.dataset.repeatMeal;
      const date = getViewedDay();                         // il giorno su cui si copia, fissato ORA: l'annulla agirà su quello
      const from = isViewingToday() ? 'di ieri' : 'del giorno prima';
      const copies = repeatPreviousDay(mealId, date);      // snapshot copiati con id nuovi: i totali si ricalcolano da soli
      const label = MEALS.find(meal => meal.id === mealId).label;
      showUndo(document.getElementById('app-toast'), `${label}: copiati ${formatFoodCount(copies.length)} ${from}`,
        () => copies.forEach(copy => removeFood(mealId, copy.id, date)));
      return;
    }
    const button = event.target.closest('[data-meal-id]');
    if (button) onSelect(button.dataset.mealId);
  });
}
