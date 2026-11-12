import { SEX_OFFSET, ACTIVITY, RING_CIRCUMFERENCE } from './config.js';

export function calculateBmr({ weightKg, heightCm, age, sex }) {
  if (!(sex in SEX_OFFSET)) throw new Error(`Sesso non valido: ${sex}`);
  return 10 * weightKg + 6.25 * heightCm - 5 * age + SEX_OFFSET[sex];
}

export function calculateTargets(profile) {
  const bmr = calculateBmr(profile);
  const tdee = bmr * ACTIVITY[profile.activity ?? 'sedentary']; // di default sedentario se non specificato, sintassi strana me l'ha consigliata gemini non la sepevo...
  return {
    lose: Math.max(Math.round(tdee - 500), Math.round(bmr)), // il valore minimo mai sotto il BMR, allora non si sopravvive ); e non si può scendere sotto il BMR
    maintain: Math.round(tdee),
    gain: Math.round(tdee + 300),
  };
}

/** Lunghezza dell'arco dell'anello (stroke-dasharray = `${arco} ${CIRCONFERENZA}`).
 *  Deve restare tra 0 e la circonferenza, anche se mangi più dell'obiettivo. */
export function ringDashArray(eaten, goal) {
  if (goal <= 0) {
    return `0 ${RING_CIRCUMFERENCE}`;
  }
  // Salviamo il calcolo in una variabile
  const arc = Math.min(Math.round((eaten / goal) * RING_CIRCUMFERENCE), RING_CIRCUMFERENCE);
  // Restituiamo la stringa formattata pronta per il DOM
  return `${arc} ${RING_CIRCUMFERENCE}`;
}

/** macro in grammi. Kcal per grammo: proteine 4, carboidrati 4, grassi 9. */
export function calculateMacroTargets(kcalGoal, weightKg) {
  return {
    protein: Math.round(1.8 *weightKg), // 1.8 g/kg di proteine
    fat: Math.round((0.30 * kcalGoal) / 9), // 30% delle kcal da grassi
    carbs: Math.round((kcalGoal - (1.8 * weightKg * 4) - ((0.30 * kcalGoal))) / 4), // il resto da carboidrati
  }
}
