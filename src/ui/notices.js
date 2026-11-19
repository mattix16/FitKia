// Avvisi che proteggono i dati locali:
//   - banner in cima se il salvataggio su disco non riesce (quota piena, navigazione privata);
//   - card in Home: suggerimento "Aggiungi alla Home" su Safari/iOS, oppure promemoria del backup (uno alla volta).
// La logica che decide COSA mostrare è pura (meta.js); qui si legge il browser e si disegna.
import { backupReminder, shouldShowInstallHint } from '../meta.js';
import { daysWithEntries } from '../log.js';
import { persistAll, snoozeBackupReminder, dismissInstallHint } from '../store.js';
import { exportBackup, backupDoneMessage, BACKUP_FAILED_MESSAGE } from './settings.js';
import { flashStatus } from './forms.js';
import { toneIcon } from './icons.js';

const $ = id => document.getElementById(id);

/** Ciò che serve a riconoscere "Safari su iOS in una scheda del browser": si legge SOLO qui, così meta.js resta puro. */
const browserEnv = () => ({
  userAgent: navigator.userAgent,
  platform: navigator.platform,
  maxTouchPoints: navigator.maxTouchPoints,
  standalone: navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches,
});

const BACKUP_ACTIONS = `<button type="button" data-notice="backup" class="btn-soft h-9 px-4 text-sm">Scarica</button>
  <button type="button" data-notice="snooze" class="min-h-9 px-2 text-xs font-semibold text-muted">Più tardi</button>`;

/** Contenuto della card. Solo stringhe nostre e numeri (niente testo dell'utente): innerHTML è sicuro. */
const NOTICES = {
  install: () => ({ icon: 'install', title: 'Aggiungi Fitkia alla Home',
    text: 'In Safari i dati di un sito possono essere cancellati dopo una settimana senza usarlo. Tocca Condividi e poi «Aggiungi alla schermata Home».',
    actions: '<button type="button" data-notice="dismiss-install" class="btn-soft h-9 px-4 text-sm">Ho capito</button>' }),
  never: () => ({ icon: 'backup', title: 'Salva un backup dei tuoi dati',
    text: 'Restano solo su questo dispositivo: scarica un file di backup per non perderli.', actions: BACKUP_ACTIONS }),
  stale: ({ days }) => ({ icon: 'backup', title: `Ultimo backup ${days} giorni fa`,
    text: 'Scaricane uno nuovo: ci vuole un tocco.', actions: BACKUP_ACTIONS }),
};

/** Quale avviso mostrare in Home, se ce n'è uno: prima il suggerimento iOS, poi il promemoria. */
function currentNotice(state) {
  if (shouldShowInstallHint(state.meta, browserEnv())) return { kind: 'install' };
  return backupReminder({ meta: state.meta, dataDays: daysWithEntries(state.logs) });
}

async function downloadBackup() {
  try {
    const name = await exportBackup();                   // null = nell'app Android l'utente ha chiuso il menu "Condividi": niente da dire
    if (name) flashStatus($('app-toast'), backupDoneMessage(name), 4000);
  } catch {
    flashStatus($('app-toast'), BACKUP_FAILED_MESSAGE, 4000);
  }
}

/** Collega gli eventi UNA volta sola. */
export function mountNotices() {
  $('storage-backup').addEventListener('click', downloadBackup);
  $('storage-retry').addEventListener('click', persistAll);
  $('notice').addEventListener('click', event => {
    const action = event.target.closest('[data-notice]')?.dataset.notice;
    if (action === 'backup') downloadBackup();
    if (action === 'snooze') snoozeBackupReminder();
    if (action === 'dismiss-install') dismissInstallHint();
  });
}

export function renderNotices(state) {
  // Banner: visibile anche in onboarding (il salvataggio del profilo può fallire). Senza profilo non c'è nulla da esportare.
  $('storage-alert').classList.toggle('hidden', !state.saveFailed);
  $('storage-backup').classList.toggle('hidden', !state.profile);

  const box = $('notice');
  const notice = state.profile && state.view === 'home' ? currentNotice(state) : null;
  box.classList.toggle('hidden', !notice);
  if (!notice) { box.innerHTML = ''; return; }
  const view = NOTICES[notice.kind](notice);
  box.innerHTML = `<div class="hairline flex items-center gap-3 rounded-2xl bg-surface p-3">
    ${toneIcon(view.icon, { size: 18, box: 'h-9 w-9 rounded-lg' })}
    <div class="min-w-0 flex-1"><p class="text-[13px] font-bold">${view.title}</p><p class="text-xs text-muted">${view.text}</p></div>
    <div class="flex shrink-0 flex-col items-stretch gap-1">${view.actions}</div></div>`;
}
