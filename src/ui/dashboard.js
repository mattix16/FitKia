import { MEALS } from '../config.js';
import { calculateTargets, calculateMacroTargets, ringDashArray, toPercent } from '../nutrition.js';
import { dayTotals, emptyDay, todayKey, shiftDayKey, nextStep } from '../log.js';
import { waterOn, waterGoalMl, isChecked, weightHistory } from '../habits.js';
import { addWater, repeatYesterday, removeFood } from '../store.js';
import { renderMeals } from './meals.js';
import { showUndo } from './toast.js';
import { formatLiters, formatDecimal, formatFoodCount } from './format.js';

const $ = id => document.getElementById(id);
const setText = (id, text) => { $(id).textContent = text; };
const fmt = new Intl.NumberFormat('it-IT');
// Mette una delle due classi in base alla condizione (e toglie l'altra). toggle(classe, condizione) aggiunge o toglie.
const swapClass = (el, condition, whenTrue, whenFalse) => {
  el.classList.toggle(whenTrue, condition);
  el.classList.toggle(whenFalse, !condition);
};
const dateFmt = new Intl.DateTimeFormat('it-IT', { weekday: 'long', day: 'numeric', month: 'long' }); // creato una volta sola
const mealLabel = id => MEALS.find(meal => meal.id === id).label;

// Un array di dati + un solo template = niente markup copiato 3 volte. Le classi sono scritte INTERE (serve a Tailwind).
const MACROS = [
  { key: 'protein', label: 'Proteine',    colorClass: 'bg-protein' },
  { key: 'carbs',   label: 'Carboidrati', colorClass: 'bg-carbs' },
  { key: 'fat',     label: 'Grassi',      colorClass: 'bg-fat' },
];

/** Contenuto della card "prossimo passo": testo + UNA azione. Tutte le stringhe sono nostre (niente input utente). */
const STEP_VIEWS = {
  repeat: s => ({ icon: '↻', title: `${mealLabel(s.mealId)} come ieri?`, text: `Copia ${formatFoodCount(s.count)} di ieri con un tocco.`, action: `<button type="button" data-step="repeat" data-meal="${s.mealId}" class="btn-primary !w-auto px-4 !py-2 text-sm">Copia</button>` }),
  log: s => ({ icon: '🍽️', title: `È ora: ${mealLabel(s.mealId).toLowerCase()}`, text: 'Registrala ora, così il conteggio resta preciso.', action: `<button type="button" data-step="log" data-meal="${s.mealId}" class="btn-primary !w-auto px-4 !py-2 text-sm">Aggiungi</button>` }),
  weight: () => ({ icon: '⚖️', title: 'Pesati stamattina', text: 'A digiuno e alla stessa ora: il trend è più affidabile.', action: '<a href="#diary" class="btn-soft inline-flex h-9 items-center px-4 text-sm">Vai</a>' }),
  water: () => ({ icon: '💧', title: 'Un bicchiere d\'acqua?', text: 'Sei sotto metà dell\'obiettivo di oggi.', action: '<button type="button" data-water="250" class="btn-soft h-9 px-4 text-sm">+250 ml</button>' }),
  supplements: s => ({ icon: '✅', title: `${s.count} ${s.count === 1 ? 'integratore' : 'integratori'} da spuntare`, text: 'Chiudi la giornata con la to-do completa.', action: '<a href="#diary" class="btn-soft inline-flex h-9 items-center px-4 text-sm">Apri</a>' }),
};

let openPanel = () => {};

/** Eventi della home (UNA volta). `onOpenMeal` apre il pannello alimenti (lo passa main.js). */
export function mountDashboard(onOpenMeal) {
  openPanel = onOpenMeal;
  $('home-water').closest('section').addEventListener('click', event => {
    const button = event.target.closest('[data-water]');
    if (button) addWater(Number(button.dataset.water));
  });
  $('next-step').addEventListener('click', event => {
    const water = event.target.closest('[data-water]');
    if (water) return addWater(Number(water.dataset.water));
    const step = event.target.closest('[data-step]');
    if (!step) return;
    const mealId = step.dataset.meal;
    if (step.dataset.step === 'log') return openPanel(mealId);
    const copies = repeatYesterday(mealId);
    showUndo($('app-toast'), `${mealLabel(mealId)}: copiati ${formatFoodCount(copies.length)} di ieri`,
      () => copies.forEach(copy => removeFood(mealId, copy.id)));
  });
}

export function renderDashboard(state) {
  const { profile, habits } = state;
  const today = todayKey();
  const day = state.logs[today] ?? emptyDay();
  const yesterday = state.logs[shiftDayKey(today, -1)] ?? emptyDay();
  const totals = dayTotals(day);                         // "consumate" è DERIVATO dal diario, non un numero a parte
  const goal = calculateTargets(profile)[profile.goal];
  const eaten = totals.kcal;
  const over = eaten > goal;

  setText('date-header', dateFmt.format(new Date()));
  setText('welcome-header', `Ciao, ${profile.name}`);     // textContent: il nome dell'utente non è mai HTML
  setText('kcal-goal', fmt.format(goal));
  setText('kcal-eaten', fmt.format(eaten));
  setText('kcal-remaining', fmt.format(Math.abs(goal - eaten)));
  setText('kcal-remaining-label', over ? 'kcal in eccesso' : 'kcal rimanenti');

  const ring = $('ring-progress');
  ring.style.strokeDasharray = ringDashArray(eaten, goal);   // via CSS: così la transizione .ring lo anima
  swapClass(ring, over, 'stroke-danger', 'stroke-brand');
  // Oltre l'obiettivo anche il numero e l'etichetta al centro diventano rossi.
  swapClass($('kcal-remaining'), over, 'text-danger', 'text-ink');
  swapClass($('kcal-remaining-label'), over, 'text-danger', 'text-muted');

  renderMacros(totals, calculateMacroTargets(goal, profile.weightKg));
  renderMeals($('meal-list'), day, yesterday);

  // --- Oggi in breve
  const waterMl = waterOn(habits, today);
  const waterGoal = waterGoalMl(profile.weightKg);
  // Solo numeri calcolati da noi (nessun testo dell'utente): innerHTML qui è sicuro.
  $('home-water').innerHTML = `${formatLiters(waterMl)} <span class="block text-xs font-medium text-muted">di ${formatLiters(waterGoal)}</span>`;
  $('home-water-bar').setAttribute('aria-valuemax', String(waterGoal));
  $('home-water-bar').setAttribute('aria-valuenow', String(waterMl));
  $('home-water-fill').style.width = `${toPercent(waterMl, waterGoal)}%`;

  const doneSupplements = habits.supplements.filter(s => isChecked(habits, today, s.id)).length;
  const supplementsLeft = habits.supplements.length - doneSupplements;
  setText('home-supplements', habits.supplements.length ? `${doneSupplements} / ${habits.supplements.length}` : '—');
  setText('home-supplements-hint', habits.supplements.length === 0 ? 'Aggiungili →' : supplementsLeft === 0 ? 'Tutti presi ✓' : 'Spunta →');

  const [lastWeight] = weightHistory(habits, 1);
  const hasWeightToday = lastWeight?.date === today;
  setText('home-weight', lastWeight ? `${formatDecimal(lastWeight.kg)} kg` : '—');
  setText('home-weight-hint', hasWeightToday ? 'Oggi ✓' : 'Registra →');

  // --- Prossimo passo (uno solo, o nessuno)
  const step = nextStep({ hour: new Date().getHours(), day, yesterday, waterMl, waterGoalMl: waterGoal, hasWeightToday, supplementsLeft });
  const card = $('next-step');
  card.classList.toggle('hidden', !step);
  if (step) {
    const view = STEP_VIEWS[step.kind](step);
    card.innerHTML = `<div class="hairline flex items-center gap-3 rounded-2xl bg-surface p-4">
      <span aria-hidden="true" class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-tint text-lg">${view.icon}</span>
      <div class="min-w-0 flex-1"><p class="text-sm font-bold">${view.title}</p><p class="text-xs text-muted">${view.text}</p></div>
      ${view.action}</div>`;
  }
}

function renderMacros(totals, targets) {
  $('macros').innerHTML = MACROS.map(({ key, label, colorClass }) => {
    const eaten = Math.round(totals[key]);
    return `<div class="flex-1 flex flex-col gap-1.5">
      <span class="text-xs font-medium text-muted">${label}</span>
      <div role="progressbar" aria-label="${label}" aria-valuemin="0" aria-valuemax="${targets[key]}" aria-valuenow="${eaten}" class="h-1.5 overflow-hidden rounded-full bg-track">
        <div class="bar-fill h-1.5 rounded-full ${colorClass}" style="width:${toPercent(eaten, targets[key])}%"></div>
      </div>
      <span class="text-xs text-muted tabular-nums"><b class="text-[15px] font-semibold text-ink">${eaten}</b> / ${targets[key]} g</span>
    </div>`;
  }).join('');
}
