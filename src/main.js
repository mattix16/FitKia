// main.js COORDINA: collega i pezzi, non conosce i dettagli. Ordine di avvio in init().
import { hydrate, getState, setState, saveProfile, subscribe } from './store.js';
import { defaultMealId } from './log.js';
import { mountOnboarding } from './ui/onboarding.js';
import { renderDashboard } from './ui/dashboard.js';
import { renderNav } from './ui/nav.js';
import { mountSettings, renderSettings } from './ui/settings.js';
import { viewFromHash } from './router.js';
import { mountMeals } from './ui/meals.js';
import { mountFoodPanel, openFoodPanel } from './ui/foodPanel.js';

const $ = id => document.getElementById(id);

function render(state) {
  const hasProfile = Boolean(state.profile);
  $('onboarding-section').classList.toggle('hidden', hasProfile);
  $('app-section').classList.toggle('hidden', !hasProfile);
  if (!hasProfile) return;

  // Una sola vista visibile alla volta: quella indicata dallo stato.
  document.querySelectorAll('[data-view]').forEach(el => el.classList.toggle('hidden', el.dataset.view !== state.view));
  renderNav(state.view);
  if (state.view === 'home') renderDashboard(state);
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
const syncView = () => setState({ view: viewFromHash(location.hash) });

function init() {
  hydrate();                                                                  // 1. leggi i dati salvati
  mountOnboarding($('onboarding-form'), saveProfile);    // 2. collega gli eventi (una volta)
  mountMeals($('meal-list'), openFoodPanel);
  mountFoodPanel();
  mountSettings();
  $('add-food-button').addEventListener('click', () => openFoodPanel(defaultMealId()));
  window.addEventListener('hashchange', syncView);
  syncView();                                                                 // vista iniziale dall'indirizzo
  subscribe(render);                                                          // 3. ogni cambio di stato -> render
  render(getState());                                                         // 4. primo render
  registerServiceWorker();
}

init();