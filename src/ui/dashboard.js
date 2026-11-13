import { calculateTargets, calculateMacroTargets, ringDashArray, toPercent } from '../nutrition.js';
import { dayTotals, emptyDay, todayKey } from '../log.js';
import { renderMeals } from './meals.js';

const $ = id => document.getElementById(id);
const setText = (id, text) => { $(id).textContent = text; };
const fmt = new Intl.NumberFormat('it-IT');
const dateFmt = new Intl.DateTimeFormat('it-IT', { weekday: 'long', day: 'numeric', month: 'long' }); // creato una volta sola

// Un array di dati + un solo template = niente markup copiato 3 volte. Le classi sono scritte INTERE (serve a Tailwind).
const MACROS = [
  { key: 'protein', label: 'Proteine',    colorClass: 'bg-sky-500' },
  { key: 'carbs',   label: 'Carboidrati', colorClass: 'bg-brand' },
  { key: 'fat',     label: 'Grassi',      colorClass: 'bg-amber-500' },
];

export function renderDashboard(state) {
  const { profile } = state;
  const day = state.logs[todayKey()] ?? emptyDay();
  const totals = dayTotals(day);                         // "consumate" è DERIVATO dal diario, non un numero a parte
  const goal = calculateTargets(profile)[state.goal];
  const eaten = totals.kcal;
  const over = eaten > goal;

  setText('date-header', dateFmt.format(new Date()));
  setText('welcome-header', `Ciao, ${profile.name}`);     // textContent: il nome dell'utente non è mai HTML
  setText('kcal-goal', fmt.format(goal));
  setText('kcal-eaten', fmt.format(eaten));
  setText('kcal-remaining', fmt.format(Math.abs(goal - eaten)));
  setText('kcal-remaining-label', over ? 'kcal in eccesso' : 'kcal rimanenti');

  const ring = $('ring-progress');
  ring.setAttribute('stroke-dasharray', ringDashArray(eaten, goal));
  ring.classList.toggle('stroke-red-500', over);         // toggle(classe, condizione): aggiunge o toglie
  ring.classList.toggle('stroke-brand', !over);

  renderMacros(totals, calculateMacroTargets(goal, profile.weightKg));
  renderMeals($('meal-list'), day);
}

function renderMacros(totals, targets) {
  $('macros').innerHTML = MACROS.map(({ key, label, colorClass }) => {
    const eaten = Math.round(totals[key]);
    return `<div class="flex-1 flex flex-col gap-1.5">
      <span class="text-[13px] font-bold">${label}</span>
      <div role="progressbar" aria-label="${label}" aria-valuemin="0" aria-valuemax="${targets[key]}" aria-valuenow="${eaten}" class="h-2 rounded bg-track">
        <div class="h-2 rounded ${colorClass}" style="width:${toPercent(eaten, targets[key])}%"></div>
      </div>
      <span class="text-xs font-medium text-muted"><b class="text-ink">${eaten}</b> / ${targets[key]} g</span>
    </div>`;
  }).join('');
}
