// Pagina Impostazioni. Come foodPanel: mount (eventi, UNA volta) e render (aggiorna la vista, tante volte).
import { GOAL_OPTIONS, ACTIVITY_OPTIONS, BACKUP } from '../config.js';
import { validateGoalSettings, validateProfile, validateBackup } from '../validation.js';
import { buildBackup, backupFileName, describeBackup } from '../backup.js';
import { getState, updateProfile, savePersonalData, resetAll, restoreAll } from '../store.js';
import { fillOptions, showFieldErrors, flashStatus, escapeHtml as esc } from './forms.js';
import { describeTargets } from './format.js';

const $ = id => document.getElementById(id);
const PERSONAL_FIELDS = ['name', 'age', 'weightKg', 'heightCm', 'sex'];
const exportedAtFmt = new Intl.DateTimeFormat('it-IT', { dateStyle: 'long', timeStyle: 'short' });

/** Fa scaricare un oggetto come file .json (Blob + link temporaneo). Il revoke aspetta: Safari legge l'URL in modo asincrono. */
function downloadJson(filename, data) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  const link = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Legge un File come testo con FileReader (Promise). Rifiuta se la lettura fallisce. */
function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => resolve(String(reader.result)));
    reader.addEventListener('error', () => reject(reader.error));
    reader.readAsText(file, 'utf-8');
  });
}

/** Errori di import: un elenco leggibile (i messaggi sono nostri, ma passano comunque da escapeHtml). */
function showImportErrors(errors) {
  const messages = Object.values(errors);
  $('import-error').innerHTML = messages.length === 0 ? ''
    : `<p class="font-semibold">Backup non importato: nessun dato è stato modificato.</p>
       <ul class="mt-1 list-disc pl-5">${messages.map(m => `<li>${esc(m)}</li>`).join('')}</ul>`;
}

/** Sotto la select: cosa significa il livello scelto (es. "1-3 allenamenti a settimana"). */
function showActivityHint() {
  const chosen = ACTIVITY_OPTIONS.find(o => o.id === $('goal-form').elements.activity.value);
  $('activity-hint').textContent = chosen?.hint ?? '';
}

export function mountSettings() {
  // --- obiettivo e attività
  const goalForm = $('goal-form');
  goalForm.elements.activity.addEventListener('change', showActivityHint);
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
    const weightLogged = savePersonalData(value);          // i target si ricalcolano; se il peso è cambiato registra anche la pesata
    flashStatus($('personal-status'), weightLogged ? 'Salvato ✓ · peso registrato nel diario' : 'Salvato ✓');
  });

  // --- import: FileReader -> validateBackup (Result Pattern) -> conferma -> restoreAll SOLO se ok === true
  let pending = null;
  $('import-button').addEventListener('click', () => { showImportErrors({}); $('import-file').click(); });
  $('import-file').addEventListener('change', async event => {
    const file = event.target.files[0];
    event.target.value = '';                               // così si può scegliere di nuovo lo stesso file
    if (!file) return;
    if (file.size > BACKUP.maxBytes) return showImportErrors({ file: 'Il file è troppo grande per essere un backup di Fitkia.' });

    let text;
    try { text = await readFileAsText(file); } catch { return showImportErrors({ file: 'Impossibile leggere il file. Riprova.' }); }
    const { ok, errors, value } = validateBackup(text);
    showImportErrors(errors);
    if (!ok) return;

    pending = value;
    $('import-date').textContent = value.exportedAt ? `Backup del ${exportedAtFmt.format(new Date(value.exportedAt))}` : '';
    $('import-summary').textContent = describeBackup(value); // textContent: il nome nel file non diventa mai HTML
    $('import-dialog').showModal();
  });
  $('import-dialog').addEventListener('close', () => { pending = null; });   // anche con Esc
  $('import-cancel').addEventListener('click', () => $('import-dialog').close());
  $('import-confirm').addEventListener('click', () => {
    if (!pending) return;
    restoreAll(pending);                                   // un solo setState: un solo salvataggio e un solo render
    $('import-dialog').close();
    flashStatus($('import-status'), 'Dati ripristinati ✓', 4000);
  });

  // --- export e cancellazione
  $('export-button').addEventListener('click', () => {
    const name = backupFileName();
    downloadJson(name, buildBackup(getState()));
    flashStatus($('import-status'), `Backup scaricato: ${name}`, 4000);
  });
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
  fillOptions($('goal-form').elements.activity, ACTIVITY_OPTIONS.map(({ id, label }) => ({ id, label })), profile.activity); // il dettaglio sta sotto, non nella voce (si tagliava)
  showActivityHint();
  $('goal-current').textContent = describeTargets(profile);
  $('goal-preview').textContent = '';
  PERSONAL_FIELDS.forEach(field => { $('personal-form').elements[field].value = profile[field]; });
}
