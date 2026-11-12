import { calculateTargets, calculateMacroTargets, ringDashArray } from '../nutrition.js';
import { renderMeals } from './meals.js';
import { emptyDay } from '../log.js';

const fmt = new Intl.NumberFormat('it-IT');
const setText = (id, text) => { document.getElementById(id).textContent = text; };
const dateFmt = new Intl.DateTimeFormat('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });

export function renderDashboard(state) {
  const goal = calculateTargets(state.profile)[state.goal];
  const eaten = 0; // TODO: Mattia, arriverà dai log dei pasti (nuovo modulo log.js + storage)

  setText('date-header', dateFmt.format(new Date()));
  setText('welcome-header', `Ciao, ${state.profile.name}`);
  setText('kcal-goal', fmt.format(goal));
  setText('kcal-eaten', fmt.format(eaten));
  setText('kcal-remaining', fmt.format(Math.abs(goal - eaten))); // l'unità è già nell'etichetta


  document.getElementById('ring-progress').setAttribute('stroke-dasharray', ringDashArray(eaten, goal));
  if (eaten > goal) {
    document.getElementById('ring-progress').classList.remove('stroke-brand');
    document.getElementById('ring-progress').classList.add('stroke-red-500');
    setText('kcal-remaining-label', 'Kcal in eccesso');
  }


  const macroTargets = calculateMacroTargets(goal, state.profile.weightKg);
  const macroEaten = { protein: 0, carbs: 0, fat: 0 }; // Placeholder per i dati futuri

  // Creiamo un array strutturato con i dati necessari per stampare le 3 barre
  const macrosData = [
    { label: 'Proteine', goal: macroTargets.protein, eaten: macroEaten.protein, colorClass: 'bg-sky-500' },
    { label: 'Carboidrati', goal: macroTargets.carbs, eaten: macroEaten.carbs, colorClass: 'bg-brand' },
    { label: 'Grassi', goal: macroTargets.fat, eaten: macroEaten.fat, colorClass: 'bg-amber-500' }
  ];

    const day = emptyDay(); // TODO: Mattia, poi sarà state.logs[todayKey()] ?? emptyDay()
    renderMeals(document.getElementById('meal-list'), day);

  // 1. Calcolo percentuale sicuro (tra 0 e 100)
  const toPercent = (eaten, goal) => {
    if (goal <= 0) return 0;
    return Math.min(Math.round((eaten / goal) * 100), 100);
  };

  // 2. Generazione del markup iterando sui dati
  const htmlDelleBarre = macrosData.map(macro => `
    <div class="flex-1 flex flex-col gap-1.5">
      <span class="text-[13px] font-bold">${macro.label}</span>
      <div role="progressbar" aria-label="${macro.label}" aria-valuemin="0"
           aria-valuemax="${macro.goal}" aria-valuenow="${macro.eaten}" class="h-2 rounded bg-track">
        <div class="h-2 rounded ${macro.colorClass}" style="width:${toPercent(macro.eaten, macro.goal)}%"></div>
      </div>
      <span class="text-xs font-medium text-muted"><b class="text-ink">${macro.eaten}</b> / ${macro.goal} g</span>
    </div>
  `).join('');
  // 3. Iniezione nel DOM
  document.getElementById('macros').innerHTML = htmlDelleBarre;


}