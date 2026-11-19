// main.js COORDINA: collega i pezzi, non conosce i dettagli. Ordine di avvio in init().
import { hydrate, getState, setState, saveProfile, subscribe, setViewedDay, getDayLog, isViewingToday } from './store.js';
import { defaultMealId, firstEmptyMealId, todayKey } from './log.js';
import { mountOnboarding } from './ui/onboarding.js';
import { mountDashboard, renderDashboard } from './ui/dashboard.js';
import { renderNav } from './ui/nav.js';
import { mountSettings, renderSettings } from './ui/settings.js';
import { mountDiary, renderDiary } from './ui/diary.js';
import { viewFromHash, backAction } from './router.js';
import { mountMeals } from './ui/meals.js';
import { mountFoodPanel, openFoodPanel } from './ui/foodPanel.js';
import { mountNotices, renderNotices } from './ui/notices.js';
import { requestPersistence } from './storage.js';
import { onHardwareBack } from './native.js';

const $ = id => document.getElementById(id);

let shownDay = todayKey(); // il giorno che la schermata sta mostrando

function render(state) {
  shownDay = todayKey();
  const hasProfile = Boolean(state.profile);
  renderNotices(state);                                  // avvisi: salvataggio non riuscito, suggerimento Home, promemoria backup
  $('onboarding-section').classList.toggle('hidden', hasProfile);
  $('app-section').classList.toggle('hidden', !hasProfile);
  if (!hasProfile) return;

  // Una sola vista visibile alla volta: quella indicata dallo stato.
  document.querySelectorAll('[data-view]').forEach(el => el.classList.toggle('hidden', el.dataset.view !== state.view));
  renderNav(state.view);
  if (state.view === 'home') renderDashboard(state);
  if (state.view === 'diary') renderDiary(state);
  if (state.view === 'settings') renderSettings(state);
}

const isLocalhost = ['localhost', '127.0.0.1'].includes(location.hostname);

function registerServiceWorker() {
  if (isLocalhost) return; // in sviluppo la cache nasconderebbe le tue modifiche
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(err => console.warn('SW non registrato', err));
  }
}

// L'indirizzo (#diary...) è la fonte della vista: così funzionano anche il tasto "indietro" e i segnalibri.
const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Allinea lo stato all'indirizzo. Con `animate` usa la View Transitions API (dissolvenza) dove esiste; altrimenti cambia e basta. */
function syncView(animate = true) {
  const update = () => setState({ view: viewFromHash(location.hash) });
  if (animate && document.startViewTransition && !prefersReducedMotion()) {
    const transition = document.startViewTransition(update);
    transition.ready.catch(() => {});      // transizione saltata (es. scheda in background): non è un errore
    transition.finished.catch(() => {});
  } else {
    update();
  }
}

function init() {
  hydrate();                                                                  // 1. leggi i dati salvati
  mountOnboarding($('onboarding-form'), saveProfile);    // 2. collega gli eventi (una volta)
  mountMeals($('meal-list'), openFoodPanel);
  mountDashboard(openFoodPanel);
  mountFoodPanel();
  mountSettings();
  mountDiary();
  mountNotices();
  // Oggi il "+" propone il pasto dell'ora; su un giorno passato l'ora non c'entra: il primo pasto ancora vuoto di quel giorno.
  $('add-food-button').addEventListener('click', () => openFoodPanel(isViewingToday() ? defaultMealId() : firstEmptyMealId(getDayLog())));
  // La tab Home vuol dire "oggi": toccarla riporta sempre al giorno corrente (un giorno passato si apre da Progressi).
  document.querySelector('[data-nav="home"]').addEventListener('click', () => setViewedDay(null));
  window.addEventListener('hashchange', () => syncView());
  // Android: il tasto "indietro" chiude la finestra aperta, poi torna a oggi / alla Home; dalla Home di oggi esce dall'app (nel browser non fa nulla).
  onHardwareBack(() => {
    const dialog = document.querySelector('dialog[open]');
    const { view, viewedDay } = getState();
    const action = backAction({ hasOpenDialog: dialog !== null, view, viewedDay });
    if (action === 'close-dialog') dialog.close();
    else if (action === 'go-home') location.hash = '#home';
    else if (action === 'go-today') setViewedDay(null);
    return action !== 'exit';
  });
  // App rimasta aperta (o in background) a cavallo della mezzanotte: tornando visibile, se il giorno è cambiato si ridisegna.
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && todayKey() !== shownDay) render(getState());
  });
  syncView(false);                                                            // vista iniziale dall'indirizzo (senza animazione)
  subscribe(render);                                                          // 3. ogni cambio di stato -> render
  render(getState());                                                         // 4. primo render
  registerServiceWorker();
  // Chiede al browser di non cancellare i dati quando serve spazio. In background, solo con dati da proteggere (un profilo);
  // si riprova a ogni avvio finché non è concesso (Chrome decide da solo, Firefox può chiedere un permesso).
  if (getState().profile) requestPersistence();
}

init();
