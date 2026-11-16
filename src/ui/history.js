import { HISTORY_DAYS } from '../config.js';
import { calculateTargets, toPercent } from '../nutrition.js';
import { recentDays } from '../log.js';
import { formatInt, formatDayLabel } from './format.js';

export function renderHistory(state) {
  const goal = calculateTargets(state.profile)[state.profile.goal];
  document.getElementById('history-list').innerHTML = recentDays(state.logs, HISTORY_DAYS).map((day, i) => {
    const over = day.kcal > goal;
    const label = formatDayLabel(day.date, i);
    return `<li>
      <div class="flex items-baseline justify-between">
        <span class="text-sm font-semibold capitalize">${label}</span>
        <span class="text-sm ${over ? 'font-bold text-red-600' : 'text-muted'}">${formatInt(day.kcal)} / ${formatInt(goal)} kcal</span>
      </div>
      <div role="progressbar" aria-label="Calorie di ${label}" aria-valuemin="0" aria-valuemax="${goal}" aria-valuenow="${day.kcal}" class="mt-1.5 h-2 rounded bg-track">
        <div class="h-2 rounded ${over ? 'bg-red-500' : 'bg-brand'}" style="width:${toPercent(day.kcal, goal)}%"></div>
      </div></li>`;
  }).join('');
}
