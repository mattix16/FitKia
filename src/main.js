import { hydrate, getState, setState, subscribe } from './store.js';
import { mountOnboarding } from './ui/onboarding.js';
import { renderDashboard } from './ui/dashboard.js';


function render(state) {
  const hasProfile = Boolean(state.profile);
  document.getElementById('onboarding-section').classList.toggle('hidden', hasProfile);
  document.getElementById('dashboard-section').classList.toggle('hidden', !hasProfile);
  if (hasProfile) renderDashboard(state);
}

const isLocalhost = ['localhost', '127.0.0.1'].includes(location.hostname);

function registerServiceWorker() {
  if (isLocalhost) return; // in sviluppo la cache nasconderebbe le modifiche
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(err => console.warn('SW non registrato', err));
  }
}

function init() {
  hydrate();                                            // 1. leggi i dati salvati
  mountOnboarding(document.getElementById('onboarding-form'), profile => setState({ profile }));
  subscribe(render);                                    // 2. ogni cambio di stato -> render
  render(getState());    
  mountMeals(document.getElementById('meal-list'), mealId => {
  console.log('Pasto scelto:', mealId); });                               // 3. primo render
  registerServiceWorker();
}

init();