# M4: Tailwind compilato (design doc, 2026-11-19)

Approvato dall'utente il 2026-11-19 ("Procedi"). Prepara il passo Capacitor/Android.

## Obiettivo

Togliere il CDN di Tailwind. Oggi `index.html` scarica Tailwind da internet a ogni apertura e genera gli stili nel browser. Dopo, l'app usa un file `app.css` già pronto, incluso nel pacchetto: zero dipendenze di rete (l'offline vale anche per il primo avvio) e nessun lampeggio di pagina senza stile.

## Verifiche fatte prima di iniziare

- Nessuna classe costruita dinamicamente: tutte le classi variabili sono stringhe intere dentro ternari (`'bg-danger'`, `' ring-2 ring-brand/40'`, `'!bg-action'`...). La scansione di `index.html` e `src/**/*.js` le trova: nessuna safelist. L'unica interpolazione, `var(--${...})`, sta in uno `style` inline.
- Il CDN usa Tailwind v3.4: resto sulla v3.4 (la v4 ha un'impostazione diversa).
- `e2e/browser.cjs` finge il CDN e legge il tema da `index.html`; il pacchetto `playwright` non è in `package.json`, quindi `npm run e2e` non gira comunque.

## Cambiamenti

1. `package.json`: `tailwindcss@~3.4` come dipendenza di sviluppo; script `build:css`, `watch:css`, `dev` (prima `build:css`, poi `serve`).
2. `tailwind.config.cjs` (`.cjs` perché il progetto è `"type": "module"`): `content: ['./index.html', './src/**/*.js']` e lo stesso `theme.extend` di oggi (font, 19 colori `rgb(var(--nome) / <alpha-value>)`, `ease-spring`).
3. `src/styles/input.css`: tutto il contenuto del blocco `<style type="text/tailwindcss">` (temi chiaro/scuro, `.card`, `.chip`, `.liquid-glass`, animazioni...), preceduto da `@tailwind base; @tailwind components; @tailwind utilities;`. I marcatori `THEME-START/END` restano.
4. `index.html`: via lo script del CDN, la config inline e il blocco `<style>`; al loro posto `<link rel="stylesheet" href="app.css">`.
5. `sw.js`: `./app.css` nel `PRECACHE`, via la gestione del CDN; `VERSION = 'v14'`.
6. `e2e/browser.cjs`: smette di fingere il CDN, legge la regola di blocco scroll da `input.css` e carica `app.css`.
7. README: `npm run build:css` e `npm run dev` in "Per iniziare"; M4 aggiornata.
8. `.gitignore`: `www/` (servirà al passo Capacitor).

## Verifica

- Confronto con il CDN: stessa pagina con CDN e con `app.css`, stessi dati, viste e finestre; confronto degli stili calcolati di ogni elemento, in tema chiaro e scuro, e dei selettori delle regole generate.
- `npm test` (145 test) verde; console del browser senza errori e senza l'avviso del CDN.
- Non verificabili qui: l'offline reale con il service worker (spento su localhost) e `npm run e2e`.

## Scelte

- `app.css` si committa (piccolo; l'app resta servibile così com'è da un hosting statico). Va rigenerato con `npm run build:css` dopo aver cambiato classi o `input.css`.
- Tailwind v3.4, non v4.
- `playwright` non viene aggiunto a `package.json` in questo step.
