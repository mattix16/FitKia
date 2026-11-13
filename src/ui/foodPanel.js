// Finestra "aggiungi alimento": cerca nel dizionario, scegli, scrivi i grammi, aggiungi.
import { searchFoods } from '../data/foods.js';
import { nutrientsFor } from '../nutrition.js';
import { parseNumber } from '../validation.js';
import { MEALS, LIMITS } from '../config.js';
import { addFood, removeFood, getToday, subscribe } from '../store.js';

const $ = id => document.getElementById(id);
// I nomi possono venire da un'API (testo esterno): prima di metterli in innerHTML si "neutralizzano" i caratteri speciali.
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

let currentMeal = null; // pasto per cui la finestra è aperta
let results = [];       // ultimi risultati di ricerca
let selected = null;    // alimento scelto

const readGrams = () => {
  const grams = parseNumber($('food-grams').value);
  return grams >= LIMITS.grams.min && grams <= LIMITS.grams.max ? grams : null; // null = non valido
};

async function showResults() {
  results = await searchFoods($('food-search').value);
  $('food-results').innerHTML = results.map(food => `<li><button type="button" class="eating-button" data-food-id="${esc(food.id)}">
      <span class="flex-1 min-w-0 truncate">${esc(food.name)}</span>
      <span class="text-xs text-muted">${food.per100g.kcal} kcal/100 g</span></button></li>`).join('')
    || '<li class="text-sm text-muted">Nessun risultato</li>';
}

function showPreview() {
  const grams = readGrams();
  $('food-add').disabled = !(selected && grams);
  if (!selected || !grams) { $('food-preview').textContent = ''; return; }
  const n = nutrientsFor(selected, grams);               // calcolo dinamico mentre scrivi
  $('food-preview').textContent = `${n.kcal} kcal · P ${n.protein} g · C ${n.carbs} g · G ${n.fat} g`;
}

function renderEntries() {
  const entries = getToday()[currentMeal] ?? [];
  $('food-entries').innerHTML = entries.map(e => `<li class="flex items-center gap-3 rounded-2xl bg-canvas px-4 py-2.5">
      <span class="flex-1 min-w-0 truncate text-sm">${esc(e.name)} · ${e.grams} g</span>
      <span class="text-sm font-bold">${e.kcal} kcal</span>
      <button type="button" data-entry-id="${esc(e.id)}" aria-label="Rimuovi ${esc(e.name)}" class="h-9 w-9 rounded-full bg-tint text-deep">✕</button></li>`).join('')
    || '<li class="text-sm text-muted">Nessun alimento aggiunto</li>';
}

/** Collega gli eventi UNA volta sola (come mountMeals e mountOnboarding). */
export function mountFoodPanel() {
  $('food-close').addEventListener('click', () => $('food-dialog').close());
  $('food-search').addEventListener('input', showResults);
  $('food-grams').addEventListener('input', showPreview);

  $('food-results').addEventListener('click', event => {
    const button = event.target.closest('[data-food-id]');
    if (!button) return;
    selected = results.find(food => food.id === button.dataset.foodId);
    $('food-selected').textContent = selected.name;
    $('food-grams').value = 100;                          // porzione di default
    $('food-picker').classList.remove('hidden');
    showPreview();
    $('food-grams').focus();
  });

  $('food-add').addEventListener('click', () => {
    const grams = readGrams();
    if (!selected || !grams) return;
    addFood(currentMeal, selected, grams);
    selected = null;
    $('food-picker').classList.add('hidden');
    $('food-search').value = '';
    showResults();
  });

  $('food-entries').addEventListener('click', event => {
    const button = event.target.closest('[data-entry-id]');
    if (button) removeFood(currentMeal, button.dataset.entryId);
  });

  // Se lo stato cambia mentre la finestra è aperta, aggiorna l'elenco "Già aggiunti".
  subscribe(() => { if ($('food-dialog').open) renderEntries(); });
}

export function openFoodPanel(mealId) {
  currentMeal = mealId;
  selected = null;
  $('food-dialog-title').textContent = MEALS.find(meal => meal.id === mealId).label;
  $('food-search').value = '';
  $('food-picker').classList.add('hidden');
  showResults();
  renderEntries();
  $('food-dialog').showModal();                          // finestra modale nativa
}
