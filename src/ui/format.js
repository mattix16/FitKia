// Formattazione per la UI (numeri e date in italiano). I formattatori si creano UNA volta: costruirli costa.
import { calculateTargets, calculateMacroTargets } from '../nutrition.js';

const int = new Intl.NumberFormat('it-IT');
const one = new Intl.NumberFormat('it-IT', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const liters = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 2 });
const shortDate = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short' });
const weekdayDate = new Intl.DateTimeFormat('it-IT', { weekday: 'long', day: 'numeric', month: 'short' });

// 'YYYY-MM-DD' -> Date locale (new Date('2026-11-12') sarebbe in UTC e potrebbe slittare di giorno)
const parseKey = key => { const [y, m, d] = key.split('-').map(Number); return new Date(y, m - 1, d); };

export const formatInt = n => int.format(n);
export const formatDecimal = n => one.format(n);
export const formatLiters = ml => `${liters.format(ml / 1000)} L`;
export const formatShortDate = key => shortDate.format(parseKey(key));
const longDate = new Intl.DateTimeFormat('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
const dateWithYear = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short', year: 'numeric' });
const narrowWeekday = new Intl.DateTimeFormat('it-IT', { weekday: 'narrow' });
/** "giovedì 19 novembre" */
export const formatLongDate = key => longDate.format(parseKey(key));
/** "lunedì 16 nov" */
export const formatWeekdayDate = key => weekdayDate.format(parseKey(key));
/** "3 mar 2027" (le date stimate possono cadere l'anno dopo) */
export const formatDateWithYear = key => dateWithYear.format(parseKey(key));
/** "L", "M", "G"...: l'iniziale del giorno della settimana */
export const formatNarrowWeekday = key => narrowWeekday.format(parseKey(key));
export const formatDayLabel = (key, index) => (index === 0 ? 'Oggi' : index === 1 ? 'Ieri' : weekdayDate.format(parseKey(key)));
/** +0,3 / −0,6 / 0,0 (con il segno meno vero, non il trattino) */
export const formatSigned = n => `${n > 0 ? '+' : n < 0 ? '−' : ''}${one.format(Math.abs(n))}`;
const rate = new Intl.NumberFormat('it-IT', { minimumFractionDigits: 1, maximumFractionDigits: 2 });
/** Ritmo in kg a settimana col segno: +0,5 / −0,75 / −0,32 (fino a 2 decimali: i ritmi scelti sono 0,25 / 0,5 / 0,75) */
export const formatRate = n => `${n > 0 ? '+' : n < 0 ? '−' : ''}${rate.format(Math.abs(n))}`;
/** "1 alimento" / "3 alimenti" */
export const formatFoodCount = n => `${n} ${n === 1 ? 'alimento' : 'alimenti'}`;
/** "1.780 kcal · P 144 g · C 160 g · G 59 g" per un profilo (anche ipotetico). Lo usano Impostazioni e il riepilogo dell'onboarding. */
export function describeTargets(profile) {
  const kcal = calculateTargets(profile)[profile.goal];
  const { protein, carbs, fat } = calculateMacroTargets(kcal, profile.weightKg);
  return `${formatInt(kcal)} kcal · P ${protein} g · C ${carbs} g · G ${fat} g`;
}
