# Rifiniture per il rilascio 1.0: barra nativa, tastiera, selettori e icona (design doc, 2026-11-19)

Approvato dall'utente il 2026-11-19: ha scelto l'icona C dopo la proposta (barra, tastiera, schede al posto dei menu, icona in vetro).
Nasce dalla registrazione dello schermo del test su telefono (Samsung, Android) e da una riproduzione su emulatore (Android 17, WebView 145).

## Perché

L'utente ha provato la 1.0 sul telefono e ha trovato quattro difetti: (1) la barra "Fitkia" copre l'app, (2) l'inserimento dei dati ha problemi di interfaccia, (3) la scelta dell'attività apre una schermata grigia che non gli piace, (4) l'icona è semplice e poco moderna. Obiettivo: un'app che non sembri un prototipo nel momento in cui la installa chi non è lo sviluppatore.

## Fatti verificati sull'emulatore (non ipotesi)

- La barra "Fitkia" è la **barra del titolo nativa di Android**, non fa parte della pagina. Da Android 12 `Theme.SplashScreen` non la spegne più, e `MainActivity` chiama `EdgeToEdge.enable` PRIMA che Capacitor passi ad `AppTheme.NoActionBar`: la finestra nasce già con la barra. Copre i primi ~60 px della pagina.
- La stessa barra fa restringere la pagina **due volte** quando esce la tastiera: `innerHeight` 578 ma `visualViewport.height` 241 (la pagina disegna solo nel terzo superiore, il resto resta vuoto, la barra in basso sta a metà schermo). Dopo la correzione del tema: 578 e 578.
- Il menu grigio è il `<select>` nativo di Android (4 voci senza descrizione). In Impostazioni la descrizione ("1-3 allenamenti a settimana") sta sotto il campo perché nella voce si tagliava.
- Con la tastiera aperta la barra "Liquid Glass" in basso resta sopra la tastiera e copre i campi (pesata in Progressi, form di Impostazioni).
- Nel foglio "Aggiungi alimento" titolo e ricerca scorrono via insieme al resto, e con molti risultati il campo grammi e il pulsante "Aggiungi" finiscono sotto la piega.

## Obiettivi, non obiettivi, anti-obiettivi

- Obiettivi: nessuna barra nativa; tutto lo spazio sopra la tastiera; la barra in basso non copre mai un campo; "Aggiungi" sempre visibile; scelte a schede nello stile dell'app; icona moderna e coerente con la palette.
- Non obiettivi: nuove funzioni, cambi al modello dei dati o alla validazione, plugin Capacitor aggiuntivi (niente `@capacitor/keyboard`), icona monocromatica Android 13, cambio di `versionCode`/`versionName`.
- Anti-obiettivi: logica solo-Android nell'interfaccia (il browser e la PWA devono comportarsi bene); un'app più lenta o che funziona meno offline; menu a tendina travestiti da schede ma meno accessibili.

## Approcci considerati

- **Selettori.** (a) Schede selezionabili in linea [scelto]: ogni opzione è visibile con la sua descrizione, nessun tocco in più, e si basa su `<input type="radio">` veri, quindi `FormData`, validazione e tastiera restano uguali. (b) Foglio che sale dal basso: più compatto ma un tocco in più, un'altra `<dialog>` da mantenere e le descrizioni si vedono solo dopo averlo aperto. (c) Lasciare la `<select>` con uno stile: su Android il menu a comparsa resta quello di sistema, quindi non risolve.
- **Barra e tastiera.** (a) Nascondere la barra mentre si scrive, riconoscendo la tastiera dal restringersi dell'altezza visibile e dal campo di testo attivo [scelto]; (b) solo CSS `:has(:focus)`: più corto, ma se la tastiera si chiude con il pulsante "v" il campo resta attivo e la barra non torna; (c) plugin `@capacitor/keyboard`: dipendenza nativa in più per un problema che l'app risolve da sola.
- **Foglio alimenti.** Struttura a tre fasce: intestazione con titolo e ricerca (fissa), centro che scorre (preferiti, recenti, risultati, alimento personale, già aggiunti), piede con alimento scelto, grammi e "Aggiungi" (fisso, sopra la tastiera). Scartato: ridurre soltanto lo spazio dei risultati, perché non garantisce che "Aggiungi" resti visibile.
- **Icona.** Tre bozze (A anello con gradiente e fiamma, B monogramma F, C vetro): scelta C, la lastra di vetro smerigliato come la tab bar dell'app.

## Progetto

### Android (già fatto e verificato)

- `AppTheme.NoActionBarLaunch`: `android:windowActionBar=false` e `android:windowNoTitle=true`. Guardia: un test in `test/android.test.js` (fallisce senza le due righe).

### Barra in basso e tastiera

- `config.js`: `KEYBOARD_MIN_SHRINK_PX = 120`. `src/keyboard.js` (puro): `readKeyboard({ typing, baseline, viewportHeight })` → `{ open, baseline }`. Senza campo di testo attivo la misura di riferimento è l'altezza attuale (rotazione, barre di sistema); con un campo attivo la tastiera è aperta se l'altezza si è ridotta di più della soglia.
- `src/ui/keyboard.js`: `mountKeyboard()` ascolta `visualViewport.resize`, `resize`, `focusin`, `focusout` e imposta `data-keyboard` su `<html>`.
- `input.css`: con `html[data-keyboard]` la barra (`id="main-nav"`) scende e sparisce (`transform`, `opacity`, `visibility`); torna da sola.

### Foglio "Aggiungi alimento"

- `index.html`: la `<dialog>` diventa una colonna (`open:flex open:flex-col`, mai `flex` da solo: romperebbe la chiusura). Intestazione fissa (titolo, chiudi, ricerca), centro `min-h-0 flex-1 overflow-y-auto`, `#food-undo` sopra il piede, `#food-picker` come piede fisso e compatto: nome e anteprima, porzioni, riga con grammi e "Aggiungi" affiancati. I risultati perdono il limite `max-h-48`: scorre tutto il centro.
- `foodPanel.js`: stessi id e stessi eventi; cambia solo il markup che si genera (nessuna logica nuova).

### Schede al posto delle `<select>`

- `config.js`: `SEX_OPTIONS` (id uguali alle chiavi di `SEX_OFFSET`, un test lo verifica).
- `forms.js`: `fillChoices(container, name, options, selectedId, variant)` disegna radio veri dentro `<label class="choice">`; varianti `list` (Obiettivo, Attività con descrizione) e `segmented` (Sesso, Ritmo). `setChoice(form, name, value)` ricolloca la selezione senza ridisegnare. `fillOptions` sparisce con l'ultima `<select>`.
- `index.html`: `<fieldset>` + `<legend>` al posto di label+select (onboarding: sesso, obiettivo, attività; Impostazioni: obiettivo, attività, ritmo, sesso). `#activity-hint` sparisce (la descrizione è nella scheda); `#rate-hint` resta e dice anche i kg a settimana.
- `settings.js`: i gestori `change` passano a un solo gestore sul form (un `RadioNodeList` non ha `addEventListener`), con lo stesso ordine di prima: prima la proposta del ritmo per il nuovo obiettivo, poi l'anteprima.
- `input.css`: `.choice`, `.choice-mark`, `.segmented`; stato scelto con `:has(input:checked)`, anello visibile con `:has(input:focus-visible)`, bersaglio di tocco ≥ 48 px.

### Icona (C, vetro)

- `scripts/make-icons.mjs`: tre livelli dallo stesso disegno. Sfondo: sfumatura diagonale dalla palette dell'app (`accent` #A7A0F0 → `brand` #7AA2F7 → `water` #7DC8F0), riflesso in alto a sinistra e ombra morbida sotto la lastra. Primo piano: lastra di vetro (bianco traslucente, bordo luminoso), anello calorie con arco e goccia al centro; tutto dentro la zona sicura di 72 dp, **senza ombre fuori dalla lastra** (il test conta ogni pixel non trasparente).
- Android: `mipmap-*/ic_launcher_background.png` (nuovo livello sfondo) al posto del colore unico; `ic_launcher.xml` e `ic_launcher_round.xml` puntano al nuovo sfondo. PWA e icone classiche = sfondo + primo piano + maschera.
- Test: `icons.test.js` e `android.test.js` si adattano (angoli pieni, misure, zona sicura, livello sfondo presente e opaco).

### Resto

- `sw.js`: `VERSION = 'v16'` e i due nuovi moduli nel precache (il test lo pretende). `app.css` rigenerato con `npm run build:css`. README: sezioni Icone e Barre di sistema/tastiera.

## Test e verifica

- Nuovi: `test/keyboard.test.js` (tutti i casi di `readKeyboard`), `test/config.test.js` (`SEX_OPTIONS` allineato). Adattati: `icons.test.js`, `android.test.js`.
- Interfaccia (senza test automatici): provata nel browser (onboarding, Impostazioni, foglio alimenti, barra) e sull'emulatore Android con la tastiera aperta, controllando altezza visibile, posizione della barra e pulsante "Aggiungi".

## Lasciato a chi costruisce

Misure esatte e raggi delle schede, colori di dettaglio e riflessi dell'icona (entro i vincoli sopra), testi brevi delle descrizioni, animazioni (brevi, e spente da `prefers-reduced-motion`).
