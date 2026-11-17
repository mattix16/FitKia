// Scheda Peso: form, grafico del trend (pesate + media mobile 7 giorni) ed elenco.
// Le coordinate le calcola nutrition.js (funzione pura): qui si costruisce solo l'SVG.
import { WEIGHT_HISTORY_SHOWN, WEIGHT_CHART_POINTS, WEIGHT_CHART, MOVING_AVERAGE_DAYS } from '../config.js';
import { weightTrendChart } from '../nutrition.js';
import { validateWeightInput } from '../validation.js';
import { logWeight, deleteWeight } from '../store.js';
import { weightHistory } from '../habits.js';
import { escapeHtml as esc } from './forms.js';
import { formatDecimal, formatShortDate, formatSigned } from './format.js';

const $ = id => document.getElementById(id);

let chartPoints = [];        // punti dell'ultimo render (servono a click/tastiera)
let selectedDate = null;     // punto evidenziato
let drawnSignature = '';     // evita di rianimare la linea se i dati non sono cambiati

const readout = p => `${formatShortDate(p.date)} · ${formatDecimal(p.kg)} kg · media ${MOVING_AVERAGE_DAYS} gg ${formatDecimal(p.avgKg)} kg`;

function selectPoint(date) {
  selectedDate = date;
  const point = chartPoints.find(p => p.date === date);
  $('weight-chart-readout').textContent = point ? readout(point) : '';
  $('weight-chart').querySelectorAll('[data-point-date]').forEach(dot => {
    dot.setAttribute('aria-pressed', String(dot.dataset.pointDate === date));
  });
  const guide = $('weight-chart').querySelector('#weight-guide');
  if (guide && point) { guide.setAttribute('x1', point.x); guide.setAttribute('x2', point.x); guide.classList.remove('hidden'); }
}

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

  // Punti interattivi: tocco/click o tastiera (Invio, Spazio, frecce sinistra/destra).
  const svg = $('weight-chart');
  svg.addEventListener('click', event => {
    const dot = event.target.closest('[data-point-date]');
    if (dot) selectPoint(dot.dataset.pointDate);
  });
  svg.addEventListener('keydown', event => {
    const dot = event.target.closest('[data-point-date]');
    if (!dot) return;
    const index = chartPoints.findIndex(p => p.date === dot.dataset.pointDate);
    const step = { ArrowLeft: -1, ArrowRight: 1 }[event.key];
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); selectPoint(dot.dataset.pointDate); }
    if (step && chartPoints[index + step]) {
      event.preventDefault();
      const next = chartPoints[index + step].date;
      selectPoint(next);
      svg.querySelector(`[data-point-date="${next}"]`)?.focus();
    }
  });
}

/** 0 pesate: invito. 1 pesata: il punto da solo + spiegazione. 2+: linea, media tratteggiata e punti. */
function renderChart(weight) {
  const svg = $('weight-chart');
  const empty = $('weight-chart-empty');
  const { width, height, padding } = WEIGHT_CHART;
  const chart = weightTrendChart(weight.slice(-WEIGHT_CHART_POINTS), WEIGHT_CHART);
  const { points, weightLine, averageLine, grid } = chart;
  chartPoints = points;

  const message = points.length === 0 ? 'Registra il peso di oggi: qui vedrai il tuo andamento.'
    : points.length === 1 ? 'Ottimo inizio! Dalla prossima pesata vedrai la linea del trend.' : '';
  empty.textContent = message;
  empty.classList.toggle('hidden', !message);
  empty.classList.toggle('flex', Boolean(message));
  svg.classList.toggle('opacity-40', points.length === 0);   // con 1 pesata il punto è già pienamente visibile

  const last = points.at(-1);
  const first = points[0];
  $('weight-trend-summary').textContent = points.length >= 2
    ? `Media ${formatSigned(Math.round((last.avgKg - first.avgKg) * 10) / 10)} kg dal ${formatShortDate(first.date)}`
    : '';
  $('weight-chart-desc').textContent = points.length >= 2
    ? `Grafico del peso: ${points.length} pesate dal ${formatShortDate(first.date)} al ${formatShortDate(last.date)}. `
      + `Ultimo peso ${formatDecimal(last.kg)} kg, media degli ultimi ${MOVING_AVERAGE_DAYS} giorni ${formatDecimal(last.avgKg)} kg.`
    : message;

  // Linee guida orizzontali (min, metà, max) con l'etichetta in kg: danno la scala senza un asse completo.
  const gridMarkup = points.length < 2 ? '' : grid.map(g => `<line x1="${padding}" x2="${width - padding}" y1="${g.y}" y2="${g.y}" class="stroke-line" stroke-width="1" stroke-dasharray="2 4"/>
    <text x="0" y="${g.y + 3.5}" font-size="10" class="fill-muted">${formatDecimal(g.kg)}</text>`).join('');

  // Rianima la linea solo se i dati sono cambiati (non a ogni render della vista).
  const signature = points.map(p => `${p.date}:${p.kg}`).join('|');
  const animate = signature !== drawnSignature;
  drawnSignature = signature;

  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.innerHTML = gridMarkup
    + (averageLine ? `<polyline points="${averageLine}" fill="none" stroke-width="2" stroke-dasharray="5 4" stroke-linecap="round" stroke-linejoin="round" class="stroke-carbs ${animate ? 'fade-late' : ''}" aria-hidden="true"/>` : '')
    + (weightLine ? `<polyline points="${weightLine}" pathLength="1" fill="none" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="stroke-brand ${animate ? 'draw-line' : ''}" aria-hidden="true"/>` : '')
    + `<line id="weight-guide" class="hidden stroke-muted/50" y1="${padding / 2}" y2="${height - padding / 2}" stroke-width="1" aria-hidden="true"/>`
    + points.map((p, i) => `<circle cx="${p.x}" cy="${p.y}" r="${i === points.length - 1 ? 5 : 3.5}" tabindex="0" role="button"
        data-point-date="${esc(p.date)}" aria-pressed="false" aria-label="${esc(readout(p))}" class="chart-dot fill-brand stroke-surface" stroke-width="1.5"/>`).join('');

  // Mantiene la selezione se il punto esiste ancora, altrimenti mostra l'ultimo.
  selectPoint(points.some(p => p.date === selectedDate) ? selectedDate : last?.date ?? null);
  if (points.length < 2) $('weight-guide')?.classList.add('hidden');
}

export function renderWeight(state) {
  renderChart(state.habits.weight);
  const rows = weightHistory(state.habits, WEIGHT_HISTORY_SHOWN);
  $('weight-list').innerHTML = rows.map(({ date, kg, delta }) => `<li class="flex items-center gap-3 rounded-xl bg-tint/60 px-4 py-2.5">
      <span class="flex-1 text-sm text-muted">${formatShortDate(date)}</span>
      ${delta === null ? '' : `<span class="text-xs font-semibold text-muted">${formatSigned(delta)} kg</span>`}
      <span class="text-sm font-bold">${formatDecimal(kg)} kg</span>
      <button type="button" data-weight-date="${esc(date)}" aria-label="Rimuovi il peso del ${formatShortDate(date)}" class="h-11 w-11 rounded-full bg-tint text-muted transition active:scale-90"><svg aria-hidden="true" class="mx-auto" width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M2 2l10 10M12 2L2 12"/></svg></button></li>`
  ).join('') || '<li class="text-sm text-muted">Nessun peso registrato: scrivi qui sopra quello di oggi.</li>';
}
