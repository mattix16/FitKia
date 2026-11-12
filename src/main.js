// main.js COORDINA: collega i pezzi, non conosce i dettagli. Ordine di avvio in init().
import { hydrate, getState, setState, subscribe } from './store.js';
import { defaultMealId } from './log.js';
import { mountOnboarding } from './ui/onboarding.js';
import { renderDashboard } from './ui/dashboard.js';
import { mountMeals } from './ui/meals.js';
import { mountFoodPanel, openFoodPanel } from './ui/foodPanel.js';

const $ = id => document.getElementById(id);

function render(state) {
  const hasProfile = Boolean(state.profile);
  $('onboarding-section').classList.toggle('hidden', hasProfile);
  $('dashboard-section').classList.toggle('hidden', !hasProfile);
  if (hasProfile) renderDashboard(state);
}

const isLocalhost = ['localhost', '127.0.0.1'].includes(location.hostname);

function registerServiceWorker() {
  if (isLocalhost) return; // in sviluppo la cache nasconderebbe le tue modifiche
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(err => console.warn('SW non registrato', err));
  }
}

function init() {
  hydrate();                                                                  // 1. leggi i dati salvati
  mountOnboarding($('onboarding-form'), profile => setState({ profile }));    // 2. collega gli eventi (una volta)
  mountMeals($('meal-list'), openFoodPanel);
  mountFoodPanel();
  $('add-food-button').addEventListener('click', () => openFoodPanel(defaultMealId()));
  subscribe(render);                                                          // 3. ogni cambio di stato -> render
  render(getState());                                                         // 4. primo render
  registerServiceWorker();
}

init();
