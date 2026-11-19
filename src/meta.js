// Logica PURA dei promemoria del dispositivo (`meta`): ultimo backup e suggerimenti già chiusi. Niente DOM, niente storage.
//   meta = { lastBackupAt: ISO | null, backupSnoozedUntil: ISO | null, installHintDismissed: boolean, weightRange: '30' | '90' | 'all' }
// `meta` NON entra nel file di backup: dice cosa è successo su QUESTO dispositivo (e le preferenze di vista), non cosa contengono i dati.
import { BACKUP_REMINDER_DAYS, BACKUP_SNOOZE_DAYS, BACKUP_MIN_DATA_DAYS, WEIGHT_RANGES, DEFAULT_WEIGHT_RANGE } from './config.js';

const MS_PER_DAY = 86_400_000;
const isIsoDate = v => typeof v === 'string' && !Number.isNaN(Date.parse(v));
const isWeightRange = id => WEIGHT_RANGES.some(range => range.id === id);

export const emptyMeta = () => ({ lastBackupAt: null, backupSnoozedUntil: null, installHintDismissed: false, weightRange: DEFAULT_WEIGHT_RANGE });

/** Dati letti dal disco (assenti, vecchi o rovinati) -> sempre una forma valida. */
export function normalizeMeta(raw) {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) return emptyMeta();
  return {
    lastBackupAt: isIsoDate(raw.lastBackupAt) ? raw.lastBackupAt : null,
    backupSnoozedUntil: isIsoDate(raw.backupSnoozedUntil) ? raw.backupSnoozedUntil : null,
    installHintDismissed: raw.installHintDismissed === true,
    weightRange: isWeightRange(raw.weightRange) ? raw.weightRange : DEFAULT_WEIGHT_RANGE,   // chiave salvata prima del selettore -> 30 giorni
  };
}

// Ogni azione restituisce un meta NUOVO (lo store ragiona per sostituzione). `now` si passa nei test.
export const markBackupDone = (meta, now = new Date()) => ({ ...meta, lastBackupAt: now.toISOString(), backupSnoozedUntil: null });
export const snoozeBackupReminder = (meta, now = new Date(), days = BACKUP_SNOOZE_DAYS) =>
  ({ ...meta, backupSnoozedUntil: new Date(now.getTime() + days * MS_PER_DAY).toISOString() });
export const dismissInstallHint = meta => ({ ...meta, installHintDismissed: true });
/** Il periodo del grafico peso. Un id sconosciuto non cambia nulla. */
export const setWeightRange = (meta, id) => (isWeightRange(id) ? { ...meta, weightRange: id } : meta);

/**
 * Serve un promemoria di backup? null = no.
 *   - rinvio ("Più tardi") ancora attivo -> null
 *   - nessun backup mai fatto -> { kind: 'never' }, ma solo con almeno BACKUP_MIN_DATA_DAYS giorni di diario (al primo avvio non c'è nulla da salvare)
 *   - ultimo backup più vecchio di BACKUP_REMINDER_DAYS giorni INTERI -> { kind: 'stale', days }
 *   - data dell'ultimo backup nel futuro (orologio sballato) -> null
 * @param {{ meta: ReturnType<typeof emptyMeta>, dataDays: number, now?: Date }} input dataDays = giorni con almeno un alimento (daysWithEntries)
 */
export function backupReminder({ meta, dataDays, now = new Date() }) {
  if (meta.backupSnoozedUntil && now < new Date(meta.backupSnoozedUntil)) return null;
  if (!meta.lastBackupAt) return dataDays >= BACKUP_MIN_DATA_DAYS ? { kind: 'never' } : null;
  const days = Math.floor((now - new Date(meta.lastBackupAt)) / MS_PER_DAY);
  return days > BACKUP_REMINDER_DAYS ? { kind: 'stale', days } : null;
}

/**
 * Siamo in Safari su iPhone/iPad, in una scheda del browser (non nell'app aggiunta alla Home)? Pura: i valori li legge la UI.
 * iPadOS finge di essere un Mac: lo si riconosce da `platform === 'MacIntel'` con lo schermo tattile. Chrome, Firefox, Edge e Opera
 * su iOS hanno il loro marcatore nello user agent e restano fuori: il suggerimento descrive i passi di Safari.
 * @param {{ userAgent?: string, platform?: string, maxTouchPoints?: number, standalone?: boolean }} env
 */
export function isIosSafariTab({ userAgent = '', platform = '', maxTouchPoints = 0, standalone = false } = {}) {
  const ios = /iPad|iPhone|iPod/.test(userAgent) || (platform === 'MacIntel' && maxTouchPoints > 1);
  const safari = /Safari/.test(userAgent) && !/CriOS|FxiOS|EdgiOS|OPiOS|GSA/.test(userAgent);
  return ios && safari && !standalone;
}

export const shouldShowInstallHint = (meta, env) => !meta.installHintDismissed && isIosSafariTab(env);
