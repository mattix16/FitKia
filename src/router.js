// Logica PURA del "router": da un hash (es. '#diary') al nome della vista. Niente DOM: si testa con node:test.
export const VIEWS = ['home', 'diary', 'settings'];

export function viewFromHash(hash) {
  const name = String(hash ?? '').replace(/^#/, '');
  return VIEWS.includes(name) ? name : 'home'; // hash sconosciuto o vuoto -> home
}
