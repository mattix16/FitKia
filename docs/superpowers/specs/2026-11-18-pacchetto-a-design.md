# Pacchetto A + fix piccoli: design doc (2026-11-18)

Approvato dall'utente il 2026-11-18. Origine: analisi dell'app (A1-A4, fix 1, 2, 3, 5, due ritocchi UX).

## Vincoli

- Storage invariato: formato `{ v, data }`, nessuna chiave nuova; le voci del diario restano in grammi.
- `log.js` e `foods.js` restano puri (niente `document`, `window`, `localStorage`).
- `id`, `data-*` e `aria-*` esistenti non cambiano.
- Nessun nuovo file in `src/` (il `PRECACHE` del service worker non cambia); `VERSION` in `sw.js` passa da `v10` a `v11`.

## 1. Fix piccoli

- **Fix 1 (manifest).** `theme_color` e `background_color` -> `#F4F4F7` (canvas chiaro). Il manifest ha un solo valore: in scuro, dopo il caricamento, vale il meta `theme-color` per-schema di `index.html`; solo lo splash resta chiaro. Le icone in `icons/` sono ancora verdi: fuori scope.
- **Fix 2 (peso in Impostazioni).** `habits.js`: `weightOnOr(habits, date, fallbackKg)`. `store.js`: `savePersonalData(value)` arrotonda il peso a 1 decimale e lo confronta con la pesata di oggi (o, se manca, con `profile.weightKg`). Se cambia: un solo `setState` con profilo e `addWeight` (sostituisce la pesata di oggi, niente doppioni). Se è uguale: solo profilo. Ritorna `true` se ha registrato una pesata; `settings.js` lo dice nel messaggio. Non toccato: l'onboarding non registra la prima pesata; cancellare una pesata non riporta indietro `profile.weightKg`.
- **Fix 5.** Il testo di "Elimina tutti i dati" cita anche alimenti personali e pasti preferiti.

## 2. A1: modifica grammi di una voce

```js
// log.js (pure)
scaleEntry(entry, grams)            // stessa voce (stesso id) scalata; null se grams non e' finito e > 0, o entry.grams <= 0
replaceEntry(day, mealId, entry)    // nuovo giorno, voce di pari id sostituita IN POSIZIONE; id assente -> stesso giorno
// store.js
updateEntry(mealId, entryId, grams) // ritorna la voce PRIMA della modifica, o null
replaceEntry(mealId, entry)         // per l'annulla (importa la pura come replaceEntryIn)
```

Flusso: tocco sulla voce -> il picker passa in modalita' modifica -> "Aggiorna" -> `previous = updateEntry(...)` -> `showUndo(..., () => replaceEntry(meal, previous))`. L'annulla rimette lo snapshot esatto (nessuna deriva). Limite noto: modifiche ripetute su valori gia' arrotondati possono derivare di circa 1 kcal.

UI: si riusa il picker (`food-picker`). Stato `editing = { mealId, entry } | null`, esclusivo con `selected`. Il pulsante `food-add` diventa "Aggiorna"; nuovo `food-edit-cancel`. Si esce da modifica con: Aggiorna, "Annulla modifica", scelta di un alimento dai risultati, apertura del pannello, rimozione della voce, o sparizione della voce dallo stato.

## 3. A2: porzioni a pezzi

`foods.js`: campo opzionale `portions: [{ label: '1 uovo', grams: 60 }]` (label non vuota, grams intero tra 1 e `LIMITS.grams.max`, etichette uniche per alimento). Nel picker, `#food-portions` mostra chip `.chip` (`data-portion-grams`, `aria-pressed` se coincide con i grammi correnti). Il tocco IMPOSTA i grammi, non li moltiplica. Funziona anche in modalita' modifica. Nel log restano solo i grammi.

## 4. A3 + fix 3: ricerca e dizionario

```js
foldText(s)                  // NFD senza diacritici, minuscolo, trim: 'Caffe'' -> 'caffe'
stemWord(w)                  // toglie le vocali finali tenendo almeno 3 lettere: uova/uovo -> uov, spaghetti -> spaghett
matchFoods(query, foods)     // pura e sincrona; searchFoods(query, custom) resta async con la stessa firma
```

Parole = `name` + `aliases` (campo opzionale, solo ricerca), foldate e divise su `/[^a-z0-9]+/`. Livelli di priorita' (si ordina per livello, poi per ordine di partenza: prima i personali, poi il dizionario):

- **4**: ogni token (stemmato) coincide con una parola del nome e la prima parola coincide col primo token ("mela" -> Mela).
- **3**: ogni token coincide con una parola in un altro punto del nome o in un alias; oppure il nome inizia con la query scritta a meta' ("mela" -> Melanzane).
- **2**: la query inizia a un confine di parola.
- **1**: la query e' una sottostringa interna.

(Il livello 4 e' stato aggiunto in implementazione: il test `mela` ha mostrato che "Melanzane" pareggiava "Mela".)

Query vuota: tutto, come prima. I token si confrontano per **uguaglianza di radice** (non per prefisso): cosi' `mela` non porta `melone` e `latte` non porta `lattuga`; la digitazione parziale e' coperta dai livelli 3/2/1.

Dizionario: +60 alimenti (id e nomi unici). Birra e vini non passano `isPlausibleFood` (l'alcol ha 7 kcal/g e non e' tracciato): `foods.test.js` li esenta esplicitamente (tetto 100 kcal), `isPlausibleFood` non cambia.

## 5. A4: recenti per pasto

`recentFoods(logs, limit, today = todayKey(), days = 30, mealId = null)`. Con `mealId`: ordine per volte nel pasto, poi volte totali, poi piu' recente; i grammi sono l'ultima porzione in quel pasto, se c'e', altrimenti l'ultima in assoluto. Senza `mealId`: identico a prima. `foodPanel` passa `currentMeal`.

## 6. Onboarding: riepilogo dei target

`describeTargets` passa da `settings.js` a `ui/format.js` (stessa stringa). Nuovo `<dialog id="welcome-dialog">` in stile `import-dialog`, aperto da `onboarding.js` dopo `onValid(value)`: titolo, obiettivo e attivita', riquadro `bg-tint` con la stringa dei target, nota "stime indicative", pulsante "Inizia". `main.js` non cambia. `e2e/browser.cjs` chiude il dialog dopo l'onboarding.

## 7. Home: grammi nel riepilogo del pasto

`meals.js`: `${entry.name} (${entry.grams} g)`, sempre in `textContent` (quindi niente `escapeHtml`). Lo span passa da `truncate` a `line-clamp-2` (senza `block`, che ne annullerebbe il `display`).

## Test (`node:test`)

`log.test.js`: `scaleEntry`, `replaceEntry`, `recentFoods` con `mealId`. `foods.test.js`: `foldText`, `stemWord`, `matchFoods`, integrita' di `portions` e `aliases`, termini obbligatori, esenzione alcol. `habits.test.js`: `weightOnOr`.

## Commit proposti

1. `fix(pwa): allinea theme_color e background_color del manifest alla nuova palette`
2. `fix(settings): registra la pesata quando il peso cambia in Impostazioni`
3. `fix(settings): cita alimenti personali e preferiti nell'avviso di eliminazione dati`
4. `feat(foods): ricerca senza accenti, con plurali e priorita' a chi inizia con la query`
5. `feat(foods): 60 nuovi alimenti e alias di ricerca`
6. `feat(foods): porzioni a pezzi con chip nel picker`
7. `feat(log): modifica i grammi di una voce gia' aggiunta, con annulla`
8. `feat(log): recenti filtrati per pasto`
9. `feat(onboarding): mostra i target calcolati dopo "Salva e inizia"`
10. `feat(home): grammi accanto agli alimenti nel riepilogo del pasto`
11. `chore(sw): versione v11`
