# Pacchetto B + A5 + rinomina tab (design doc, 2026-11-19)

Approvato dall'utente il 2026-11-19 ("Procedi con entrambi"). Step 3 di 3; richiede lo Step 2 (`migrate()` e `meta`).

## Rinomina "Diario" → "Progressi"

Cambiano l'etichetta nella tab bar, l'`<h1>` della vista e il README. `VIEWS`, `#diary` e `data-view="diary"` restano identici. "Diario alimentare" in Home resta.

## A5: giorni passati (disaccoppiare `todayKey()`)

- Stato `viewedDay: null | 'YYYY-MM-DD'`, non persistito (come `view`); `null` = oggi e segue la mezzanotte. `PERSISTED` non cambia.
- Store: `getViewedDay()`, `getDayLog(date)` (sostituisce `getToday`), `getPreviousDayLog(date)` (`getYesterday`), `previousDayCount(mealId, date)` (`yesterdayCount`), `setViewedDay(date)` (rifiuta formati errati e date future; oggi → `null`).
- Le mutazioni del diario (`addFood`, `removeFood`, `restoreEntry`, `updateEntry`, `replaceEntry`, `repeatPreviousDay`, `saveFavorite`, `addFavoriteToMeal`) ricevono un `date` finale con default `getViewedDay()`; `setToday` diventa `setDay(date, day)`. Le chiusure di annulla catturano la data al momento dell'azione. Acqua, integratori e peso restano di oggi.
- `foodPanel` cattura `currentDay` all'apertura e lo passa a tutto; i recenti partono da quel giorno; il titolo mostra il giorno se non è oggi.
- Navigazione: ogni giorno nella card "Settimana" è un pulsante che imposta `viewedDay` e porta a `#home`; la tab Home riporta sempre a oggi. Il giorno non va nell'URL.
- Indicatore in Home: `#day-banner` ("Stai modificando lunedì 16 novembre" + "Torna a oggi") e data in intestazione. Con un giorno passato si nascondono "prossimo passo" e "Oggi in breve"; "Come ieri" diventa "Come il giorno prima". Il pulsante "+" propone il primo pasto vuoto (`firstEmptyMealId`, pura).

## B1: card "Settimana"

`HISTORY_DAYS = 7`, `recentDays` riusata, `summarizeDays(days, goalKcal)` in `nutrition.js` → `{ completeDays, avgKcal, avgProtein, daysInTarget }`. Giorno registrato = `kcal > 0`; le statistiche escludono oggi (incompleto); "in target" = 85%-105% dell'obiettivo (`TARGET_BAND`). Sette colonne a barre con iniziale del giorno e linea dell'obiettivo (rosse se oltre), ognuna pulsante di A5. Id `history-card`/`history-list` invariati.

## B2: peso obiettivo e ritmo

- Profilo: `targetWeightKg` (opzionale) e `weeklyRateKg` (0,25 / 0,5 / 0,75); default `lose` 0,5, `gain` 0,25 (in `normalizeProfile`). `SCHEMA_VERSION = 2`, `MIGRATIONS[1]` aggiunge i due campi al profilo (altre chiavi intatte). I backup `schema: 1` restano importabili (`cleanProfile` passa da `validateProfile`); quelli `schema: 2` non entrano in un'app vecchia.
- Config: `KCAL_PER_KG = 7700`, `RATE_OPTIONS`, `DEFAULT_RATE`, limiti del peso obiettivo.
- Pure in `nutrition.js`: `dailyEnergyDelta(rateKg)` (275/550/825), `calculateTargets` (lose = max(tdee − delta, bmr); gain = tdee + delta), `effectiveWeeklyRateKg(profile)`, `weightTrendKgPerWeek(entries, { today, days = 28 })` (null con < 3 pesate o < 7 giorni), `estimateGoalDate({ currentKg, targetKg, kgPerWeek, today })` → `reached | eta | unreachable | null` (tetto 104 settimane). L'ETA usa il trend osservato se nel verso giusto, altrimenti il ritmo scelto, e il testo dice quale.
- `validateGoalSettings(raw, { weightKg })`: target opzionale; con `lose` sotto il peso attuale, con `gain` sopra, con `maintain` ignorato (solo al salvataggio).
- UI: "Peso obiettivo" e "Ritmo" (nascosto con `maintain`) nella card obiettivo con anteprima; riga di riepilogo nella card Peso; invito a passare a Mantenimento se raggiunto. Grafico: `target: { kg, y, clamped }`, la scala include il target solo entro 6 kg dai dati, altrimenti linea sul bordo con freccia.

## B3: intervallo del grafico peso

`WEIGHT_CHART_POINTS` sparisce; `WEIGHT_RANGES` (`30g`, `90g`, `Tutto`). `weightTrendChart(entries, { rangeDays, today, targetKg })` calcola la media mobile su tutte le pesate e poi taglia la finestra. Selettore con `aria-pressed`; scelta salvata in `meta.weightRange`. `sw.js` → `v13`.

## Test

`nutrition.test.js` (ritmi, BMR, default, trend, ETA, `summarizeDays`), `chart.test.js` (finestra, target), `validation/profile/backup.test.js` (campi nuovi, `schema: 1`), `storage.test.js` (passo 1→2), `store.test.js` (`viewedDay`, data catturata, `repeatPreviousDay`, non persistito).

## Scelte da confermare

7700 kcal/kg (default `lose` −550, `gain` +275: per gli utenti esistenti +50/−25 kcal; con 7000 resterebbe −500); statistiche senza oggi e banda 85%-105%; tab Home = oggi; "Oggi in breve" nascosto sui giorni passati; target oltre 6 kg sul bordo; `weightRange` in `meta`.
