// Come capire che la tastiera del telefono è aperta, per ritirare la barra in basso (che altrimenti resta sopra la tastiera e copre i campi).
// Logica PURA, senza DOM: le misure le legge ui/keyboard.js e questo file decide, così si prova con i numeri (vedi test/keyboard.test.js).
import { KEYBOARD_MIN_SHRINK_PX } from './config.js';

// Campi che NON aprono la tastiera di testo: scelte, pulsanti, file, cursori e selettori di data o colore.
const NO_TEXT_TYPES = new Set(['checkbox', 'radio', 'button', 'submit', 'reset', 'file', 'image', 'range', 'color', 'hidden',
  'date', 'time', 'month', 'week', 'datetime-local']);

/** true per i campi in cui si scrive (testo, numeri, ricerca, textarea, contenuto modificabile). Accetta anche oggetti { tagName, type, isContentEditable }. */
export function isTextEntry(element) {
  if (!element) return false;
  const tag = String(element.tagName ?? '').toUpperCase();
  if (tag === 'TEXTAREA') return true;
  if (tag === 'INPUT') return !NO_TEXT_TYPES.has(String(element.type ?? 'text').toLowerCase());
  return element.isContentEditable === true;
}

/**
 * La tastiera è aperta se, con un campo di testo attivo, l'altezza visibile è scesa di più della soglia rispetto alla misura di riferimento.
 * La misura di riferimento (`baseline`) è la più alta vista finora con la stessa larghezza: NON scende mai da sola (passando da un campo
 * all'altro, per un attimo nessun campo è attivo ma la tastiera è ancora lì). Se la larghezza cambia (rotazione) si riparte dalle misure attuali.
 * Con il campo attivo e la tastiera chiusa col pulsante "v", l'altezza torna alla baseline e `open` torna false.
 * @param {{ typing: boolean, baseline: { height: number, width: number }, viewport: { height: number, width: number }, minShrink?: number }} input
 * @returns {{ open: boolean, baseline: { height: number, width: number } }} chi chiama conserva `baseline` per la volta dopo
 */
export function readKeyboard({ typing, baseline, viewport, minShrink = KEYBOARD_MIN_SHRINK_PX }) {
  if (viewport.width !== baseline.width) return { open: false, baseline: { height: viewport.height, width: viewport.width } };
  const height = Math.max(baseline.height, viewport.height);
  return { open: typing && height - viewport.height > minShrink, baseline: { height, width: viewport.width } };
}
