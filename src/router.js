// Logica PURA del "router": da un hash (es. '#diary') al nome della vista, e cosa fa il tasto "indietro" di Android.
// Niente DOM: si testa con node:test.
export const VIEWS = ['home', 'diary', 'settings'];

export function viewFromHash(hash) {
  const name = String(hash ?? '').replace(/^#/, '');
  return VIEWS.includes(name) ? name : 'home'; // hash sconosciuto o vuoto -> home
}

/**
 * Che cosa deve fare il tasto "indietro" di Android? Riceve solo valori semplici (il DOM lo legge main.js).
 *   'close-dialog' = c'è una finestra aperta: si chiude (mai tornare indietro "sotto" una finestra)
 *   'go-home'      = in un'altra pagina (Progressi, Impostazioni): si torna alla Home
 *   'go-today'     = in Home su un giorno passato: si torna a oggi
 *   'exit'         = in Home, su oggi, senza finestre: si esce dall'app
 * @param {{ hasOpenDialog?: boolean, view?: string, viewedDay?: string | null }} [state]
 * @returns {'close-dialog' | 'go-home' | 'go-today' | 'exit'}
 */
export function backAction({ hasOpenDialog = false, view = 'home', viewedDay = null } = {}) {
  if (hasOpenDialog) return 'close-dialog';
  if (view !== 'home') return 'go-home';
  if (viewedDay !== null) return 'go-today';
  return 'exit';
}
