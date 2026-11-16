import { addWater } from '../store.js';
import { waterOn, waterGoalMl } from '../habits.js';
import { todayKey } from '../log.js';
import { toPercent } from '../nutrition.js';
import { formatLiters } from './format.js';

const $ = id => document.getElementById(id);

/** Un solo ascoltatore sulla scheda: i bottoni hanno data-water="250" / "-250" / "500". */
export function mountWater() {
  $('water-card').addEventListener('click', event => {
    const button = event.target.closest('[data-water]');
    if (button) addWater(Number(button.dataset.water));
  });
}

export function renderWater(state) {
  const total = waterOn(state.habits, todayKey());
  const goal = waterGoalMl(state.profile.weightKg);
  $('water-total').textContent = `${formatLiters(total)} / ${formatLiters(goal)}`;
  $('water-bar').setAttribute('aria-valuemax', String(goal));
  $('water-bar').setAttribute('aria-valuenow', String(total));
  $('water-fill').style.width = `${toPercent(total, goal)}%`;
}
