// Pagina Impostazioni. Come foodPanel: mount (eventi, UNA volta) e render (aggiorna la vista, tante volte).
import { GOAL_OPTIONS, ACTIVITY_OPTIONS } from '../config.js';
import { calculateTargets, calculateMacroTargets } from '../nutrition.js';
import { validateGoalSettings, validateProfile } from '../validation.js';
import { buildBackup, backupFileName, parseBackup, describeBackup } from '../backup.js';
import { getState, updateProfile, resetAll, restoreAll } from '../store.js';
import { fillOptions, showFieldErrors, flashStatus } from './forms.js';
import { formatInt } from './format.js';

const $ = id => document.getElementById(id);
const PERSONAL_FIELDS = ['name', 'age', 'weightKg', 'heightCm', 'sex'];

/** Fa scaricare un oggetto come file .json (Blob + link temporaneo). */
function downloadJson(filename, data) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  const link = Object.assign(document.createElement('a'), { href: url, download: filename });
  link.click();
  URL.revokeObjectURL(url);
}

/** "1780 kcal · P 144 g · C 160 g · G 59 g" per un profilo (anche ipotetico). */
function describeTargets(profile) {
  const kcal = calculateTargets(profile)[profile.goal];
  const { protein, carbs, fat } = calculateMacroTargets(kcal, profile.weightKg);
  return `${formatInt(kcal)} kcal · P ${protein} g · C ${carbs} g · G ${fat} g`;
}

export function mountSettings() {
  // --- obiettivo e attività
  const goalForm = $('goal-form');
  goalForm.addEventListener('submit', event => {
    event.preventDefault();
    const { ok, errors, value } = validateGoalSettings(Object.fromEntries(new FormData(goalForm)));
    $('goal-error').textContent = errors.goal ?? errors.activity ?? '';
    if (!ok) return;
    updateProfile(value);                                  // lo store salva e notifica: la dashboard si ricalcola da sola
    flashStatus($('goal-status'), 'Salvato ✓');
  });
  // Anteprima: cosa risulterebbe con le scelte attuali, SENZA salvare.
  goalForm.addEventListener('change', () => {
    const { ok, value } = validateGoalSettings(Object.fromEntries(new FormData(goalForm)));
    $('goal-preview').textContent = ok ? `Con queste scelte: ${describeTargets({ ...getState().profile, ...value })}` : '';
  });

  // --- dati personali: validati con le STESSE regole dell'onboarding
  const personalForm = $('personal-form');
  personalForm.addEventListener('submit', event => {
    event.preventDefault();
    const merged = { ...getState().profile, ...Object.fromEntries(new FormData(personalForm)) }; // goal/activity restano quelli salvati
    const { ok, errors, value } = validateProfile(merged);
    showFieldErrors(personalForm, errors);
    if (!ok) return;
    updateProfile(value);                                  // i target si ricalcolano perché dipendono dal profilo
    flashStatus($('personal-status'), 'Salvato ✓');
  });

  // --- import: legge il file, lo CONTROLLA (parseBackup) e chiede conferma prima di sostituire i dati
  let pending = null;
  $('import-button').addEventListener('click', () => { $('import-error').textContent = ''; $('import-file').click(); });
  $('import-file').addEventListener('change', async event => {
    const file = event.target.files[0];
    event.target.value = '';                               // così si può scegliere di nuovo lo stesso file
    if (!file) return;
    const result = parseBackup(await file.text());
    $('import-error').textContent = result.ok ? '' : result.error;
    if (!result.ok) return;
    pending = result.data;
    $('import-summary').textContent = describeBackup(pending);
    $('import-dialog').showModal();
  });
  $('import-cancel').addEventListener('click', () => { pending = null; $('import-dialog').close(); });
  $('import-confirm').addEventListener('click', () => {
    restoreAll(pending);                                   // un solo setState: un solo salvataggio e un solo render
    pending = null;
    $('import-dialog').close();
    flashStatus($('import-status'), 'Dati ripristinati ✓');
  });

  // --- export e cancellazione
  $('export-button').addEventListener('click', () => downloadJson(backupFileName(), buildBackup(getState())));
  $('delete-button').addEventListener('click', () => $('delete-dialog').showModal());
  $('delete-cancel').addEventListener('click', () => $('delete-dialog').close());
  $('delete-confirm').addEventListener('click', () => {
    resetAll();
    $('delete-dialog').close();
    location.hash = '';                                    // torna alla home (e quindi all'onboarding)
  });
}

/** Riallinea i form ai valori salvati. */
export function renderSettings(state) {
  const { profile } = state;
  fillOptions($('goal-form').elements.goal, GOAL_OPTIONS, profile.goal);
  fillOptions($('goal-form').elements.activity, ACTIVITY_OPTIONS, profile.activity);
  $('goal-current').textContent = `Obiettivo giornaliero attuale: ${describeTargets(profile)}`;
  $('goal-preview').textContent = '';
  PERSONAL_FIELDS.forEach(field => { $('personal-form').elements[field].value = profile[field]; });
}
