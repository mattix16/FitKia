// La pagina Progressi (route #diary) compone le sue schede (come dashboard.js compone anello, macro e pasti).
import { mountWater, renderWater } from './water.js';
import { mountWeight, renderWeight } from './weight.js';
import { mountSupplements, renderSupplements } from './supplements.js';
import { mountHistory, renderHistory } from './history.js';

export function mountDiary() {
  mountHistory();
  mountWater();
  mountWeight();
  mountSupplements();
}

export function renderDiary(state) {
  renderHistory(state);
  renderWater(state);
  renderWeight(state);
  renderSupplements(state);
}
