// Barra in basso e tastiera: quando esce la tastiera la barra "Liquid Glass" (position: fixed) resterebbe sopra la tastiera a coprire i campi.
// Qui si misura la parte visibile della pagina e si dice al CSS se la tastiera è aperta: <html data-keyboard>. Decide src/keyboard.js (pura).
import { readKeyboard, isTextEntry } from '../keyboard.js';

/** Misure della parte visibile, in pixel CSS interi. Con lo zoom a due dita la parte visibile si restringe anche senza tastiera: si moltiplica
 *  per `scale` per riportarla alle misure "a zoom 1". Senza visualViewport (browser vecchi) si usa la finestra intera. */
function measure() {
  const viewport = window.visualViewport;
  return viewport
    ? { height: Math.round(viewport.height * viewport.scale), width: Math.round(viewport.width * viewport.scale) }
    : { height: window.innerHeight, width: window.innerWidth };
}

/** Collega gli eventi UNA volta sola (come mountMeals e mountFoodPanel). */
export function mountKeyboard(root = document.documentElement) {
  let baseline = measure();
  const update = () => {
    const state = readKeyboard({ typing: isTextEntry(document.activeElement), baseline, viewport: measure() });
    baseline = state.baseline;
    root.toggleAttribute('data-keyboard', state.open);
  };
  window.visualViewport?.addEventListener('resize', update);
  window.addEventListener('resize', update);
  document.addEventListener('focusin', update);
  document.addEventListener('focusout', () => setTimeout(update, 0));   // activeElement cambia DOPO focusout
}
