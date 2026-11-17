import { WEIGHT_HISTORY_SHOWN, WEIGHT_CHART_POINTS } from '../config.js';
import { weightChartPoints } from '../chart.js';
import { validateWeightInput } from '../validation.js';
import { logWeight, deleteWeight } from '../store.js';
import { weightHistory } from '../habits.js';
import { escapeHtml as esc } from './forms.js';
import { formatDecimal, formatShortDate, formatSigned } from './format.js';

const $ = id => document.getElementById(id);

export function mountWeight() {
  const form = $('weight-form');
  form.addEventListener('submit', event => {
    event.preventDefault();
    const { ok, errors, value } = validateWeightInput(Object.fromEntries(new FormData(form)));
    $('weight-error').textContent = errors.weightKg ?? '';
    if (!ok) return;
    logWeight(value.weightKg);
    form.reset();
  });
  $('weight-list').addEventListener('click', event => {
    const button = event.target.closest('[data-weight-date]');
    if (button) deleteWeight(button.dataset.weightDate);
  });
}

const pointLabel = (p, anchor) => `<text x="${p.x}" y="${p.y - 10}" text-anchor="${anchor}" font-size="11" class="fill-muted">${formatDecimal(p.kg)}</text>`;

/** Linea dell'andamento: serve almeno 2 pesi; con meno, il grafico resta nascosto. */
function renderChart(weight) {
  const svg = $('weight-chart');
  const { points, path } = weightChartPoints(weight.slice(-WEIGHT_CHART_POINTS), { width: 320, height: 120, padding: 18 });
  svg.classList.toggle('hidden', points.length < 2);
  if (points.length < 2) return;
  const first = points[0];
  const last = points.at(-1);
  svg.setAttribute('aria-label', `Andamento del peso: da ${formatDecimal(first.kg)} a ${formatDecimal(last.kg)} kg, dal ${formatShortDate(first.date)} al ${formatShortDate(last.date)}`);
  svg.innerHTML = `<path d="${path}" fill="none" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="stroke-brand"/>`
    + points.map((p, i) => `<circle cx="${p.x}" cy="${p.y}" r="${i === points.length - 1 ? 5 : 3.5}" class="fill-brand"/>`).join('')
    + pointLabel(first, 'start') + pointLabel(last, 'end');
}

export function renderWeight(state) {
  renderChart(state.habits.weight);
  const rows = weightHistory(state.habits, WEIGHT_HISTORY_SHOWN);
  $('weight-list').innerHTML = rows.map(({ date, kg, delta }) => `<li class="flex items-center gap-3 rounded-2xl bg-canvas px-4 py-2.5">
      <span class="flex-1 text-sm text-muted">${formatShortDate(date)}</span>
      ${delta === null ? '' : `<span class="text-xs text-muted">${formatSigned(delta)} kg</span>`}
      <span class="text-sm font-bold">${formatDecimal(kg)} kg</span>
      <button type="button" data-weight-date="${esc(date)}" aria-label="Rimuovi il peso del ${formatShortDate(date)}" class="h-11 w-11 rounded-full bg-tint text-deep">✕</button></li>`
  ).join('') || '<li class="text-sm text-muted">Nessun peso registrato: scrivi qui sopra quello di oggi.</li>';
}
