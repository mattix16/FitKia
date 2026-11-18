// Finestra "aggiungi alimento": copia da ieri, preferiti, recenti, ricerca, grammi, porzioni, modifica di una voce, alimento personale, annulla.
import { searchFoods, findFood } from '../data/foods.js';
import { nutrientsFor } from '../nutrition.js';
import { parseNumber, validateCustomFood, validateFavoriteName } from '../validation.js';
import { recentFoods, todayKey, favoriteKcal, scaleEntry } from '../log.js';
import { MEALS, LIMITS, MAX_RESULTS, RECENT_FOODS_SHOWN, RECENT_DAYS } from '../config.js';
import { escapeHtml as esc, showFieldErrors } from './forms.js';
import { showUndo } from './toast.js';
import { formatFoodCount } from './format.js';
import { addFood, removeFood, restoreEntry, updateEntry, replaceEntry, repeatYesterday, addCustomFood, deleteCustomFood, getState, getToday, subscribe,
  yesterdayCount, saveFavorite, deleteFavorite, addFavoriteToMeal } from '../store.js';

const $ = id => document.getElementById(id);

let currentMeal = null; // pasto per cui la finestra è aperta
let results = [];       // ultimi risultati di ricerca
let selected = null;    // alimento scelto (nuova aggiunta)
let editing = null;     // { mealId, entry }: voce già aggiunta di cui si stanno cambiando i grammi (esclusivo con `selected`)

const customFoods = () => getState().customFoods;
const readGrams = () => {
  const grams = parseNumber($('food-grams').value);
  return grams >= LIMITS.grams.min && grams <= LIMITS.grams.max ? grams : null; // null = non valido
};

/** Aggiunge e offre subito "Annulla". `meal` si legge ORA: il toast può essere premuto più tardi. */
function addWithUndo(food, grams) {
  const meal = currentMeal;
  const entry = addFood(meal, food, grams);
  showUndo($('food-undo'), `${food.name} aggiunto`, () => removeFood(meal, entry.id));
}

async function showResults() {
  results = (await searchFoods($('food-search').value, customFoods())).slice(0, MAX_RESULTS);
  $('food-results').innerHTML = results.map(food => `<li class="flex items-center gap-2">
      <button type="button" class="eating-button flex-1 min-w-0" data-food-id="${esc(food.id)}">
        <span class="flex-1 min-w-0 truncate">${esc(food.name)}${food.custom ? ' <span class="text-xs font-semibold text-deep">· tuo</span>' : ''}</span>
        <span class="text-xs text-muted">${food.per100g.kcal} kcal/100 g</span></button>
      ${food.custom ? `<button type="button" data-delete-food-id="${esc(food.id)}" aria-label="Elimina ${esc(food.name)}" class="h-11 w-11 shrink-0 rounded-full bg-tint text-muted"><svg aria-hidden="true" class="mx-auto" width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M2 2l10 10M12 2L2 12"/></svg></button>` : ''}</li>`).join('')
    || '<li class="text-sm text-muted">Nessun risultato: puoi aggiungere un alimento tuo qui sotto.</li>';
  renderQuick();
}

/** Preferiti del pasto aperto per primi, poi gli altri (una colazione salvata si può usare anche come snack). */
const sortedFavorites = () => [...getState().favorites].sort((a, b) => Number(b.mealId === currentMeal) - Number(a.mealId === currentMeal));

/** "Come ieri", "Preferiti" e "Recenti": visibili solo se la ricerca è vuota e c'è qualcosa da proporre. */
function renderQuick() {
  // I recenti di questo pasto vengono per primi (la colazione propone prima ciò che di solito si mangia a colazione).
  const recents = recentFoods(getState().logs, RECENT_FOODS_SHOWN, todayKey(), RECENT_DAYS, currentMeal)
    .filter(item => findFood(item.foodId, customFoods()));          // un alimento personale eliminato non si propone più
  $('food-recents').innerHTML = recents.map(item => `<li><button type="button" data-recent-id="${esc(item.foodId)}" data-grams="${item.grams}"
      class="chip !min-h-11 !px-4 !text-sm">${esc(item.name)} · ${item.grams} g</button></li>`).join('');

  const favorites = sortedFavorites();
  // Nomi scelti dall'utente: SEMPRE escapeHtml prima di innerHTML (anche negli aria-label).
  $('food-favorites').innerHTML = favorites.map(f => `<li class="flex items-center gap-2">
      <button type="button" data-favorite-id="${esc(f.id)}" aria-label="Aggiungi il preferito ${esc(f.name)}: ${formatFoodCount(f.items.length)}, ${favoriteKcal(f)} kcal"
        class="flex min-h-11 flex-1 items-center gap-3 hairline rounded-xl bg-tint/60 px-4 text-left transition active:scale-[.98]">
        <span aria-hidden="true" class="text-fat">★</span>
        <span class="min-w-0 flex-1 truncate text-sm font-semibold">${esc(f.name)}</span>
        <span class="text-xs text-muted">${f.items.length} · ${favoriteKcal(f)} kcal</span></button>
      <button type="button" data-delete-favorite-id="${esc(f.id)}" aria-label="Elimina il preferito ${esc(f.name)}" class="h-11 w-11 shrink-0 rounded-full bg-tint text-muted"><svg aria-hidden="true" class="mx-auto" width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M2 2l10 10M12 2L2 12"/></svg></button></li>`).join('');

  const count = yesterdayCount(currentMeal);
  $('food-repeat').classList.toggle('hidden', count === 0);
  $('food-repeat').textContent = `↻ Copia da ieri (${formatFoodCount(count)})`;
  $('food-recents-block').classList.toggle('hidden', recents.length === 0);
  $('food-favorites-block').classList.toggle('hidden', favorites.length === 0);
  $('food-quick').classList.toggle('hidden', $('food-search').value.trim() !== '' || (recents.length === 0 && count === 0 && favorites.length === 0));
}

// ---------- Picker: nuova aggiunta (selected) o modifica dei grammi di una voce già aggiunta (editing) ----------

/** Chip delle porzioni a pezzi dell'alimento (nessuno = contenitore vuoto = nascosto). Il tocco imposta i grammi. */
function renderPortions(food) {
  $('food-portions').innerHTML = (food?.portions ?? []).map(portion => `<button type="button" data-portion-grams="${portion.grams}" aria-pressed="false"
      class="chip !min-h-11 !px-4 !text-sm">${esc(portion.label)} · ${portion.grams} g</button>`).join('');
}

/** Evidenzia il chip che corrisponde ai grammi scritti. */
function markPortions(grams) {
  $('food-portions').querySelectorAll('[data-portion-grams]').forEach(chip => {
    const on = Number(chip.dataset.portionGrams) === grams;
    chip.setAttribute('aria-pressed', String(on));
    chip.classList.toggle('!bg-action', on);
    chip.classList.toggle('!text-on-action', on);
  });
}

/** Il pulsante principale dice "Aggiorna" in modifica; "Annulla modifica" compare solo allora. */
function syncPicker() {
  $('food-add').textContent = editing ? 'Aggiorna' : 'Aggiungi';
  $('food-edit-cancel').classList.toggle('hidden', !editing);
}

function showPicker({ title, food, grams }) {
  $('food-selected').textContent = title;
  $('food-grams').value = grams;
  renderPortions(food);
  syncPicker();
  $('food-picker').classList.remove('hidden');
  showPreview();
  $('food-grams').focus();
}

function closePicker() {
  selected = null;
  editing = null;
  $('food-picker').classList.add('hidden');
  syncPicker();
}

function showPreview() {
  const grams = readGrams();
  const target = editing ? editing.entry : selected;
  // In modifica si scala lo snapshot della voce (come farà updateEntry); in aggiunta si calcola dal dizionario.
  const n = target && grams ? (editing ? scaleEntry(editing.entry, grams) : nutrientsFor(selected, grams)) : null;
  $('food-add').disabled = !n;
  markPortions(grams);
  $('food-preview').textContent = n ? `${n.kcal} kcal · P ${n.protein} g · C ${n.carbs} g · G ${n.fat} g` : '';   // calcolo dinamico mentre scrivi
}

/** Tocco su una voce già aggiunta: i suoi grammi si modificano nel picker. */
function startEdit(entryId) {
  const entry = (getToday()[currentMeal] ?? []).find(e => e.id === entryId);
  if (!entry) return;
  selected = null;
  editing = { mealId: currentMeal, entry };
  showPicker({ title: entry.name, food: findFood(entry.foodId, customFoods()), grams: entry.grams });
  renderEntries();                                       // evidenzia la riga in modifica
}

function renderEntries() {
  const entries = getToday()[currentMeal] ?? [];
  $('food-entries').innerHTML = entries.map(e => `<li class="flex items-center gap-3 rounded-xl bg-tint/60 px-4 py-2.5${editing?.entry.id === e.id ? ' ring-2 ring-brand/40' : ''}">
      <button type="button" data-edit-entry-id="${esc(e.id)}" aria-label="Modifica i grammi di ${esc(e.name)}, ora ${e.grams} g"
        class="min-h-11 min-w-0 flex-1 truncate text-left text-sm">${esc(e.name)} · <span class="font-semibold text-deep">${e.grams} g</span></button>
      <span class="text-sm font-bold">${e.kcal} kcal</span>
      <button type="button" data-entry-id="${esc(e.id)}" aria-label="Rimuovi ${esc(e.name)}" class="h-11 w-11 rounded-full bg-tint text-muted"><svg aria-hidden="true" class="mx-auto" width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M2 2l10 10M12 2L2 12"/></svg></button></li>`).join('')
    || '<li class="text-sm text-muted">Nessun alimento aggiunto</li>';

  // "Salva come preferito" ha senso solo se il pasto ha qualcosa dentro.
  const form = $('favorite-form');
  form.classList.toggle('hidden', entries.length === 0);
  form.classList.toggle('flex', entries.length > 0);
  form.elements.name.placeholder = `Es. ${MEALS.find(meal => meal.id === currentMeal).label} tipo`;
}

/** Collega gli eventi UNA volta sola (come mountMeals e mountOnboarding). */
export function mountFoodPanel() {
  $('food-close').addEventListener('click', () => $('food-dialog').close());
  // Tocco FUORI dal foglio = chiudi. Conta solo se il tocco è iniziato e finito sullo sfondo (non chi trascina per selezionare testo).
  const dialog = $('food-dialog');
  let pressedBackdrop = false;
  dialog.addEventListener('pointerdown', event => { pressedBackdrop = event.target === dialog; });
  dialog.addEventListener('click', event => { if (pressedBackdrop && event.target === dialog) dialog.close(); });
  $('food-search').addEventListener('input', showResults);
  $('food-grams').addEventListener('input', showPreview);

  $('food-results').addEventListener('click', async event => {
    const del = event.target.closest('[data-delete-food-id]');
    if (del) {                                            // le voci già nel diario restano: sono "fotografie" dei valori
      deleteCustomFood(del.dataset.deleteFoodId);
      if (selected?.id === del.dataset.deleteFoodId) closePicker();
      return showResults();
    }
    const button = event.target.closest('[data-food-id]');
    if (!button) return;
    selected = results.find(food => food.id === button.dataset.foodId);
    editing = null;                                       // scegliere un alimento chiude una modifica in corso
    showPicker({ title: selected.name, food: selected, grams: 100 });   // porzione di default: 100 g
    renderEntries();
  });

  // Porzioni a pezzi: il tocco IMPOSTA i grammi (per 2 uova si scrive 120).
  $('food-portions').addEventListener('click', event => {
    const chip = event.target.closest('[data-portion-grams]');
    if (!chip) return;
    $('food-grams').value = chip.dataset.portionGrams;
    showPreview();
  });

  $('food-recents').addEventListener('click', event => {
    const chip = event.target.closest('[data-recent-id]');
    const food = chip && findFood(chip.dataset.recentId, customFoods());
    if (food) addWithUndo(food, Number(chip.dataset.grams));      // un solo tocco
  });

  $('food-repeat').addEventListener('click', () => {
    const meal = currentMeal;
    const copies = repeatYesterday(meal);
    showUndo($('food-undo'), `Aggiunti ${formatFoodCount(copies.length)} di ieri`, () => copies.forEach(copy => removeFood(meal, copy.id)));
  });

  $('food-add').addEventListener('click', () => {
    const grams = readGrams();
    if (!grams) return;
    if (editing) {                                        // "Aggiorna": cambia i grammi della voce, con "Annulla"
      const { mealId, entry } = editing;
      closePicker();
      if (grams !== entry.grams) {
        const previous = updateEntry(mealId, entry.id, grams);
        if (previous) showUndo($('food-undo'), `${previous.name}: ${previous.grams} g → ${grams} g`, () => replaceEntry(mealId, previous));
      }
      renderEntries();
      return;
    }
    if (!selected) return;
    addWithUndo(selected, grams);
    closePicker();
    $('food-search').value = '';
    showResults();
  });

  $('food-edit-cancel').addEventListener('click', () => {
    closePicker();
    renderEntries();
  });

  // Pasti preferiti: un tocco = tutti gli alimenti (snapshot salvati) nel pasto aperto, con "Annulla".
  $('food-favorites').addEventListener('click', event => {
    const del = event.target.closest('[data-delete-favorite-id]');
    if (del) return deleteFavorite(del.dataset.deleteFavoriteId);   // il diario non cambia: le voci sono copie
    const button = event.target.closest('[data-favorite-id]');
    if (!button) return;
    const meal = currentMeal;
    const favorite = getState().favorites.find(f => f.id === button.dataset.favoriteId);
    const copies = addFavoriteToMeal(meal, button.dataset.favoriteId);
    showUndo($('food-undo'), `${favorite.name}: aggiunti ${formatFoodCount(copies.length)}`, () => copies.forEach(copy => removeFood(meal, copy.id)));
  });

  const favoriteForm = $('favorite-form');
  favoriteForm.elements.name.maxLength = LIMITS.favoriteName.max;
  favoriteForm.addEventListener('submit', event => {
    event.preventDefault();
    const names = getState().favorites.map(f => f.name);
    const itemCount = (getToday()[currentMeal] ?? []).length;
    const { ok, errors, value } = validateFavoriteName(Object.fromEntries(new FormData(favoriteForm)), names, itemCount);
    showFieldErrors(favoriteForm, errors);
    if (!ok) return;
    const saved = saveFavorite(value.name, currentMeal);
    favoriteForm.reset();
    showUndo($('food-undo'), `★ "${value.name}" salvato nei preferiti`, () => deleteFavorite(saved.id));
  });

  $('food-entries').addEventListener('click', event => {
    const edit = event.target.closest('[data-edit-entry-id]');
    if (edit) return startEdit(edit.dataset.editEntryId);
    const button = event.target.closest('[data-entry-id]');
    if (!button) return;
    const meal = currentMeal;
    const removed = removeFood(meal, button.dataset.entryId);
    if (removed) showUndo($('food-undo'), `${removed.name} rimosso`, () => restoreEntry(meal, removed));
  });

  // Alimento personale
  const form = $('custom-food-form');
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const names = (await searchFoods('', customFoods())).map(food => food.name);   // dizionario + tuoi
    const { ok, errors, value } = validateCustomFood(Object.fromEntries(new FormData(form)), names, customFoods().length);
    showFieldErrors(form, errors);
    if (!ok) return;
    addCustomFood(value);
    form.reset();
    $('custom-food-details').open = false;
    $('food-search').value = value.name;                  // lo mostra subito tra i risultati
    showResults();
  });

  // Se lo stato cambia mentre la finestra è aperta (aggiungi, annulla...), aggiorna le liste.
  subscribe(() => {
    if (!$('food-dialog').open) return;
    // La voce che si stava modificando non c'è più (rimossa, o aggiunta annullata): si chiude il picker.
    if (editing && !(getToday()[editing.mealId] ?? []).some(entry => entry.id === editing.entry.id)) closePicker();
    renderEntries();
    renderQuick();
  });
}

export function openFoodPanel(mealId) {
  currentMeal = mealId;
  closePicker();
  $('food-dialog-title').textContent = MEALS.find(meal => meal.id === mealId).label;
  $('food-search').value = '';
  $('food-undo').textContent = '';
  $('favorite-error').textContent = '';
  $('favorite-form').reset();
  showResults();
  renderEntries();
  $('food-dialog').showModal();                          // finestra modale nativa
}
