// Pagina Impostazioni. Come foodPanel: mount (eventi, UNA volta) e render (aggiorna la vista, tante volte).
import { GOAL_OPTIONS, ACTIVITY_OPTIONS, SEX_OPTIONS, BACKUP, RATE_OPTIONS, DEFAULT_RATE } from '../config.js';
import { dailyEnergyDelta, effectiveWeeklyRateKg } from '../nutrition.js';
import { validateGoalSettings, validateProfile, validateBackup } from '../validation.js';
import { buildBackup, backupFileName, describeBackup } from '../backup.js';
import { getState, updateProfile, savePersonalData, resetAll, restoreAll, markBackupDone } from '../store.js';
import { fillChoices, setChoice, showFieldErrors, flashStatus, escapeHtml as esc } from './forms.js';
import { describeTargets, formatInt, formatRate } from './format.js';
import { isNativeApp, shareTextFile } from '../native.js';

const $ = id => document.getElementById(id);
const PERSONAL_FIELDS = ['name', 'age', 'weightKg', 'heightCm', 'sex'];
const exportedAtFmt = new Intl.DateTimeFormat('it-IT', { dateStyle: 'long', timeStyle: 'short' });
const lastBackupFmt = new Intl.DateTimeFormat('it-IT', { dateStyle: 'long' });

/** Fa scaricare un oggetto come file .json (Blob + link temporaneo). Il revoke aspetta: Safari legge l'URL in modo asincrono. */
function downloadJson(filename, data) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  const link = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Il testo di conferma dopo un backup: nel browser il file si scarica; nell'app Android si condivide (menu "Condividi"). */
export const backupDoneMessage = name => (isNativeApp() ? `Backup condiviso: ${name}` : `Backup scaricato: ${name}`);
export const BACKUP_FAILED_MESSAGE = 'Non sono riuscito a creare il backup. Riprova.';

/** Crea il backup e ricorda quando (meta.lastBackupAt: il promemoria si basa su questa data).
 *  Nel browser lo scarica; nell'app Android apre il menu "Condividi", perché la WebView non scarica file.
 *  Restituisce il nome del file, oppure null se l'utente ha chiuso il menu senza scegliere: allora NESSUN backup è stato fatto e la data
 *  dell'ultimo backup non cambia. Se la creazione fallisce lancia un errore (chi chiama mostra BACKUP_FAILED_MESSAGE).
 *  La usano anche gli avvisi (ui/notices.js): funziona anche se il salvataggio su disco non riesce, perché esporta lo stato in memoria. */
export async function exportBackup() {
  const name = backupFileName();
  const backup = buildBackup(getState());
  if (isNativeApp()) {
    if (await shareTextFile(name, JSON.stringify(backup, null, 2)) === 'canceled') return null;
  } else {
    downloadJson(name, backup);
  }
  markBackupDone();
  return name;
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

/** Il ritmo si sceglie solo se si dimagrisce o si ingrassa; sotto le schede dice quanto è (kg a settimana) e quante kcal al giorno
 *  (es. "0,5 kg a settimana: circa −550 kcal al giorno rispetto al tuo fabbisogno."). */
function showRateField() {
  const form = $('goal-form');
  const goal = form.elements.goal.value;
  const rate = Number(form.elements.weeklyRateKg.value);
  const chosen = RATE_OPTIONS.find(option => option.id === rate);
  $('rate-field').classList.toggle('hidden', goal === 'maintain');
  $('rate-hint').textContent = goal !== 'maintain' && chosen
    ? `${chosen.hint}: circa ${goal === 'lose' ? '−' : '+'}${formatInt(dailyEnergyDelta(rate))} kcal al giorno rispetto al tuo fabbisogno.` : '';
}

export function mountSettings() {
  // --- obiettivo, attività, peso obiettivo e ritmo: schede (radio veri) disegnate qui una volta sola; renderSettings sceglie quella salvata
  const goalForm = $('goal-form');
  fillChoices($('settings-goal'), 'goal', GOAL_OPTIONS, undefined);
  fillChoices($('settings-activity'), 'activity', ACTIVITY_OPTIONS, undefined);
  fillChoices($('settings-rate'), 'weeklyRateKg', RATE_OPTIONS, undefined, 'segmented');
  fillChoices($('settings-sex'), 'sex', SEX_OPTIONS, undefined, 'segmented');
  goalForm.addEventListener('submit', event => {
    event.preventDefault();
    // Con il peso attuale si controlla che l'obiettivo stia dalla parte giusta (sotto per dimagrire, sopra per ingrassare).
    const { ok, errors, value } = validateGoalSettings(Object.fromEntries(new FormData(goalForm)), { weightKg: getState().profile.weightKg });
    $('goal-error').textContent = Object.values(errors)[0] ?? '';
    if (!ok) return;
    updateProfile(value);                                  // lo store salva e notifica: la dashboard si ricalcola da sola
    flashStatus($('goal-status'), 'Salvato ✓');
  });
  // Un solo gestore sul form: il "change" di un radio sale fino a lì (un gruppo di radio non si ascolta radio per radio).
  goalForm.addEventListener('change', event => {
    if (event.target.name === 'goal') {                    // cambiando obiettivo, il ritmo torna a quello proposto per il nuovo obiettivo
      const proposed = DEFAULT_RATE[goalForm.elements.goal.value];
      if (proposed) setChoice(goalForm, 'weeklyRateKg', proposed);
    }
    if (event.target.name === 'goal' || event.target.name === 'weeklyRateKg') showRateField();
    // Anteprima: cosa risulterebbe con le scelte attuali, SENZA salvare.
    const { ok, value } = validateGoalSettings(Object.fromEntries(new FormData(goalForm)));
    if (!ok) { $('goal-preview').textContent = ''; return; }
    const profile = { ...getState().profile, ...value };
    const pace = value.goal === 'maintain' ? '' : ` · circa ${formatRate(effectiveWeeklyRateKg(profile))} kg a settimana`;
    $('goal-preview').textContent = `Con queste scelte: ${describeTargets(profile)}${pace}`;
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
  $('export-button').addEventListener('click', async () => {
    try {
      const name = await exportBackup();
      if (name) flashStatus($('import-status'), backupDoneMessage(name), 4000);
    } catch {
      flashStatus($('import-status'), BACKUP_FAILED_MESSAGE, 4000);
    }
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
  $('last-backup').textContent = state.meta.lastBackupAt
    ? `Ultimo backup: ${lastBackupFmt.format(new Date(state.meta.lastBackupAt))}`
    : 'Non hai ancora scaricato un backup.';
  setChoice($('goal-form'), 'goal', profile.goal);
  setChoice($('goal-form'), 'activity', profile.activity);
  setChoice($('goal-form'), 'weeklyRateKg', profile.weeklyRateKg);
  $('goal-form').elements.targetWeightKg.value = profile.targetWeightKg ?? '';
  showRateField();
  $('goal-current').textContent = describeTargets(profile);
  $('goal-preview').textContent = '';
  PERSONAL_FIELDS.forEach(field => { $('personal-form').elements[field].value = profile[field]; });
}
