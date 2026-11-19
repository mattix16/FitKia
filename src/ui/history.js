// Card "Ultimi 7 giorni" (pagina Progressi): sette colonne, una per giorno, con le kcal rispetto all'obiettivo (linea tratteggiata).
// Ogni colonna è un pulsante: apre quel giorno nella Home per registrarlo o correggerlo. Sotto, le medie dei giorni COMPLETI.
import { HISTORY_DAYS, TARGET_BAND } from '../config.js';
import { calculateTargets, summarizeDays, toPercent } from '../nutrition.js';
import { recentDays, todayKey } from '../log.js';
import { setViewedDay } from '../store.js';
import { formatInt, formatDayLabel, formatNarrowWeekday } from './format.js';

const $ = id => document.getElementById(id);
const BAR_HEADROOM = 1.3;   // l'altezza piena della colonna vale il 130% dell'obiettivo: si vede anche chi lo supera

/** Un solo ascoltatore sul contenitore (le colonne si ridisegnano a ogni render). */
export function mountHistory() {
  $('history-list').addEventListener('click', event => {
    const button = event.target.closest('[data-day]');
    if (!button) return;
    setViewedDay(button.dataset.day);                    // oggi = oggi; un giorno passato resta scelto finché non si torna a oggi
    location.hash = '#home';
  });
}

export function renderHistory(state) {
  const goal = calculateTargets(state.profile)[state.profile.goal];
  const today = todayKey();
  const viewed = state.viewedDay ?? today;
  const days = recentDays(state.logs, HISTORY_DAYS, today);                  // oggi per primo
  const goalLine = Math.round(100 / BAR_HEADROOM);

  // Da sinistra a destra: dal più vecchio a oggi. `i` = quanti giorni fa (serve all'etichetta "Oggi", "Ieri"...).
  $('history-list').innerHTML = days.map((day, i) => ({ day, i })).reverse().map(({ day, i }) => {
    const over = day.kcal > goal * TARGET_BAND.max;      // rossa solo oltre la banda "in target" (105%), come le statistiche sotto
    const height = day.kcal > 0 ? Math.max(6, toPercent(day.kcal, goal * BAR_HEADROOM)) : 3;
    const selected = day.date === viewed;
    // Solo date, numeri e testi nostri: nessun input dell'utente, innerHTML è sicuro.
    return `<button type="button" data-day="${day.date}" ${selected ? 'aria-current="date"' : ''}
      aria-label="${formatDayLabel(day.date, i)}: ${formatInt(day.kcal)} su ${formatInt(goal)} kcal. Apri il giorno."
      class="flex flex-col items-center gap-1.5 rounded-xl px-0.5 pb-1.5 pt-1 transition active:scale-95${selected ? ' ring-2 ring-brand/50' : ''}">
      <span aria-hidden="true" class="relative flex h-24 w-full items-end justify-center">
        <span class="absolute inset-x-0 border-t border-dashed border-muted/40" style="bottom:${goalLine}%"></span>
        <span class="block w-3.5 rounded-full ${day.kcal === 0 ? 'bg-track' : over ? 'bg-danger' : 'bg-brand'}" style="height:${height}%"></span>
      </span>
      <span aria-hidden="true" class="text-[11px] font-semibold uppercase ${day.date === today ? 'text-deep' : 'text-muted'}">${formatNarrowWeekday(day.date)}</span>
    </button>`;
  }).join('');

  const { completeDays, avgKcal, avgProtein, daysInTarget } = summarizeDays(days, goal, today);
  $('history-summary').textContent = completeDays === 0
    ? 'Registra almeno un giorno intero per vedere le medie.'
    : `Media ${formatInt(avgKcal)} kcal · ${daysInTarget} ${daysInTarget === 1 ? 'giorno' : 'giorni'} su ${completeDays} in target · proteine ${formatInt(avgProtein)} g`;
}
