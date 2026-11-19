const { chromium } = require('playwright');
const fs = require('fs');
const root = process.cwd();
const results = []; const ok = (label, cond, extra = '') => { results.push(cond); console.log((cond ? 'OK  ' : 'FAIL') + ' ' + label + (extra ? '  -> ' + extra : '')); };
(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ acceptDownloads: true, viewport: { width: 390, height: 844 }, locale: 'it-IT' });
  const page = await ctx.newPage();
  const errors = []; page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|net::ERR/.test(m.text())) errors.push('console: ' + m.text()); });
  // Tailwind e font non sono raggiungibili qui: stub minimo (il CDN vero genera le classi; qui basta nascondere gli elementi .hidden)
  const theme = fs.readFileSync(root + '/index.html', 'utf8').match(/THEME-START[\s\S]*?THEME-END/)?.[0].replace(/^[^\n]*\n[\s\S]*?(?=:root)/, '') ?? '';
  const lockRule = fs.readFileSync(root + '/index.html', 'utf8').match(/html:has\(dialog\[open\]\)\s*\{[^}]*\}/)?.[0];
  ok('regola CSS di blocco scroll presente in index.html', !!lockRule, lockRule);
  await page.route('**/cdn.tailwindcss.com/**', r => r.fulfill({ contentType: 'text/javascript', body: `window.tailwind = {}; (()=>{const s=document.createElement('style'); s.textContent=${JSON.stringify('.hidden{display:none !important}' + (lockRule ?? '') + theme)}; document.head.appendChild(s);})();` }));
  await page.route('**/fonts.googleapis.com/**', r => r.fulfill({ contentType: 'text/css', body: '' }));
  await ctx.addInitScript(() => { window.__vt = 0; const o = document.startViewTransition?.bind(document); if (o) document.startViewTransition = (...a) => { window.__vt++; return o(...a); }; });
  const $ = s => page.locator(s);
  const text = async s => (await $(s).textContent()).trim();
  const visible = s => $(s).isVisible();

  await page.goto('' + (process.env.BASE_URL || 'http://localhost:3000/') + '');
  await page.waitForSelector('#onboarding-section', { state: 'visible' });
  ok('onboarding: select obiettivo/attività generate', (await $('#onboarding-form select[name=goal] option').count()) === 3 && (await $('#onboarding-form select[name=activity] option').count()) === 4);
  await page.fill('[name=name]', 'Mattia'); await page.fill('#onboarding-form [name=age]', '30');
  await page.fill('#onboarding-form [name=weightKg]', '80'); await page.fill('#onboarding-form [name=heightCm]', '180');
  await page.selectOption('#onboarding-form [name=sex]', 'male');
  await page.click('#onboarding-form button[type=submit]');
  await page.waitForSelector('#app-section', { state: 'visible' });
  ok('onboarding: riepilogo del piano con kcal e macro', await $('#welcome-dialog').evaluate(d => d.open) && /kcal · P \d+ g · C \d+ g · G \d+ g/.test(await text('#welcome-targets')), await text('#welcome-targets'));
  await $('#welcome-close').click();                       // il dialog è modale: va chiuso prima di toccare la home
  ok('dopo onboarding: dashboard con saluto e obiettivo', (await text('#welcome-header')) === 'Ciao, Mattia' && /^\d/.test(await text('#kcal-goal')), await text('#kcal-goal') + ' kcal');
  ok('pasti vuoti: invitano ad aggiungere', /Aggiungi la colazione/.test(await text('#meal-list')) && /Aggiungi il pranzo/.test(await text('#meal-list')));
  ok('anello: dasharray applicato via CSS', (await page.evaluate(() => getComputedStyle(document.getElementById('ring-progress')).strokeDasharray)).length > 0);
  ok('nav: 3 link + pulsante +, nessuna voce Profilo', (await $('[data-nav]').count()) === 3 && (await $('[data-nav=profile]').count()) === 0 && (await $('[data-nav=home]').getAttribute('aria-current')) === 'page');

  // --- pannello cibi + blocco scroll
  await $('[data-meal-id=lunch]').click();
  ok('pannello aperto per il pranzo', await $('#food-dialog').evaluate(d => d.open) && (await text('#food-dialog-title')) === 'Pranzo');
  ok('BUG scroll: pagina dietro ferma con la finestra aperta', (await page.evaluate(() => getComputedStyle(document.documentElement).overflow)) === 'hidden');
  await page.mouse.click(4, 4);
  ok('TOCCO FUORI dal foglio chiude il pannello', !(await $('#food-dialog').evaluate(d => d.open)));
  await $('[data-meal-id=lunch]').click();
  ok('nessun "Recenti" al primo avvio', !(await visible('#food-quick')));
  await page.fill('#food-search', 'pasta');
  const n = await $('#food-results [data-food-id]').count(); ok('ricerca "pasta"', n >= 1, n + ' risultati');
  await $('#food-results [data-food-id]').first().click(); await page.fill('#food-grams', '150');
  ok('anteprima kcal/macro', /kcal · P/.test(await text('#food-preview')), await text('#food-preview'));
  await $('#food-add').click();
  ok('toast "aggiunto · Annulla"', /aggiunto/.test(await text('#food-undo')) && /Annulla/.test(await text('#food-undo')));
  ok('voce nel diario del pasto', (await $('#food-entries li').count()) === 1);
  await $('#food-undo [data-undo]').click();
  ok('ANNULLA toglie la voce', /Nessun alimento/.test(await text('#food-entries')));
  await page.fill('#food-search', 'pasta'); await $('#food-results [data-food-id]').first().click(); await page.fill('#food-grams', '150'); await $('#food-add').click();
  await $('#food-close').click();
  ok('scroll sbloccato a finestra chiusa', (await page.evaluate(() => getComputedStyle(document.documentElement).overflow)) !== 'hidden');
  const eaten1 = await text('#kcal-eaten'); ok('consumate aggiornate e dati salvati', eaten1 !== '0' && !!(await page.evaluate(() => localStorage.getItem('fitkia:v1:logs'))), eaten1 + ' kcal');

  // --- oltre l'obiettivo (poi si annulla)
  await $('[data-meal-id=lunch]').click();
  await page.fill('#food-search', 'olio'); await $('#food-results [data-food-id]').first().click(); await page.fill('#food-grams', '1000'); await $('#food-add').click();
  const cls = id => page.evaluate(i => document.getElementById(i).className, id);
  ok('OLTRE obiettivo: numero, etichetta e anello in colore di errore', /text-danger/.test(await cls('kcal-remaining')) && /text-danger/.test(await cls('kcal-remaining-label')) && /stroke-danger/.test(await page.evaluate(() => document.getElementById('ring-progress').getAttribute('class'))) && /eccesso/.test(await text('#kcal-remaining-label')));
  await $('#food-undo [data-undo]').click();
  ok('annullando, torna il colore normale', !/text-danger/.test(await cls('kcal-remaining')) && /text-ink/.test(await cls('kcal-remaining')) && /rimanenti/.test(await text('#kcal-remaining-label')));
  await $('#food-close').click();

  // --- recenti, rimozione con annulla
  await $('[data-meal-id=lunch]').click();
  ok('RECENTI: chip con la porzione di prima', (await visible('#food-quick')) && /150 g/.test(await text('#food-recents')), await text('#food-recents'));
  await $('#food-recents [data-recent-id]').first().click();
  ok('un tocco sul chip aggiunge', (await $('#food-entries li').count()) === 2);
  await $('#food-entries [data-entry-id]').first().click();
  ok('rimozione con toast', /rimosso/.test(await text('#food-undo')) && (await $('#food-entries li').count()) === 1);
  await $('#food-undo [data-undo]').click();
  ok('annulla la rimozione', (await $('#food-entries li').count()) === 2);

  // --- alimento personale
  await $('#custom-food-details summary').click();
  await page.fill('#custom-food-form [name=name]', 'Pane di Chiara'); await page.fill('#custom-food-form [name=kcal]', '250');
  await page.fill('#custom-food-form [name=protein]', '120'); await page.fill('#custom-food-form [name=carbs]', '50'); await page.fill('#custom-food-form [name=fat]', '1');
  await $('#custom-food-form button[type=submit]').click();
  ok('personale: macro > 100 g rifiutati con errore', (await $('#custom-food-form [data-error-for=protein]').textContent()).length > 0);
  await page.fill('#custom-food-form [name=protein]', '8.5');
  await $('#custom-food-form button[type=submit]').click();
  await page.waitForFunction(() => /Pane di Chiara/.test(document.getElementById('food-results').textContent));
  ok('personale: salvato e trovato in ricerca ("· tuo")', /· tuo/.test(await text('#food-results')));
  await $('#food-results [data-food-id]').first().click(); await $('#food-add').click();
  const withCustom = await $('#food-entries li').count(); ok('personale: aggiungibile al pasto', withCustom === 3);
  await $('#food-results [data-delete-food-id]').click();
  await page.waitForFunction(() => !/Pane di Chiara/.test(document.getElementById('food-results').textContent));
  ok('personale: eliminato dal dizionario, la voce nel diario resta', /Pane di Chiara/.test(await text('#food-entries')));
  ok('personale eliminato sparisce anche dai Recenti', !/Pane di Chiara/.test(await text('#food-recents')));
  await $('#food-close').click();

  // --- ripeti ieri (prepara un giorno precedente)
  await page.evaluate(() => {
    const key = d => d.toLocaleDateString('sv-SE'); const y = new Date(); y.setDate(y.getDate() - 1);
    const raw = JSON.parse(localStorage.getItem('fitkia:v1:logs')); const today = raw.data[key(new Date())];
    raw.data[key(y)] = { breakfast: [], lunch: [{ ...today.lunch[0], id: 'ieri-1' }, { ...today.lunch[0], id: 'ieri-2', name: 'Altro' }], dinner: [], snack: [] };
    localStorage.setItem('fitkia:v1:logs', JSON.stringify(raw));
  });
  await page.reload(); await page.waitForSelector('#app-section', { state: 'visible' });
  await $('[data-meal-id=lunch]').click();
  ok('RIPETI IERI: pulsante con il conteggio', (await visible('#food-repeat')) && /\(2 alimenti\)/.test(await text('#food-repeat')), await text('#food-repeat'));
  const before = await $('#food-entries li').count();
  await $('#food-repeat').click();
  ok('ripeti ieri copia 2 voci', (await $('#food-entries li').count()) === before + 2);
  await $('#food-undo [data-undo]').click();
  ok('annulla il "ripeti ieri"', (await $('#food-entries li').count()) === before);
  await $('#food-close').click();

  // --- diario (acqua, peso, integratori) e navigazione
  await $('[data-nav=diary]').click();
  await page.waitForSelector('[data-view=diary]', { state: 'visible' });
  ok('navigazione: vista diario e voce attiva', !(await visible('[data-view=home]')) && (await $('[data-nav=diary]').getAttribute('aria-current')) === 'page');
  await $('[data-water="500"]').click(); ok('acqua +500 ml', /0,5 L/.test(await text('#water-total')), await text('#water-total'));
  await page.fill('#weight-form [name=weightKg]', '79.4'); await $('#weight-form button[type=submit]').click();
  ok('peso registrato', /79,4 kg/.test(await text('#weight-list')));
  ok('grafico peso con un solo peso: punto + messaggio, nessuna linea', (await visible('#weight-chart-empty')) && (await $('#weight-chart polyline').count()) === 0 && (await $('#weight-chart circle').count()) === 1);
  await page.evaluate(() => {
    const key = d => d.toLocaleDateString('sv-SE'); const old = new Date(); old.setDate(old.getDate() - 4);
    const raw = JSON.parse(localStorage.getItem('fitkia:v1:habits')); raw.data.weight.unshift({ date: key(old), kg: 81.2 });
    localStorage.setItem('fitkia:v1:habits', JSON.stringify(raw));
  });
  await page.reload(); await page.waitForSelector('[data-view=diary]', { state: 'visible' });
  ok('GRAFICO PESO: con 2 pesi linea + media tratteggiata e descrizione', !(await visible('#weight-chart-empty')) && (await $('#weight-chart polyline').count()) === 2 && /2 pesate.*Ultimo peso 79,4 kg/.test(await text('#weight-chart-desc')), await text('#weight-chart-desc'));
  ok('grafico: 2 punti interattivi e 3 linee guida in kg', (await $('#weight-chart [data-point-date]').count()) === 2 && (await $('#weight-chart text').count()) === 3);
  await page.fill('#supplement-form [name=name]', 'Creatina'); await $('#supplement-form button[type=submit]').click();
  await $('#supplements-list input[type=checkbox]').check(); ok('integratore spuntato', await $('#supplements-list input[type=checkbox]').isChecked());
  ok('storico: sette colonne (una per giorno), ognuna apre il giorno', (await $('#history-list [data-day]').count()) === 7);

  // --- export / cancellazione / import
  await $('[data-nav=settings]').click(); await page.waitForSelector('[data-view=settings]', { state: 'visible' });
  const eatenBefore = await (async () => { await $('[data-nav=home]').click(); await page.waitForSelector('[data-view=home]', { state: 'visible' }); const t = await text('#kcal-eaten'); await $('[data-nav=settings]').click(); return t; })();
  const [download] = await Promise.all([page.waitForEvent('download'), $('#export-button').click()]);
  const file = '/tmp/backup.json'; await download.saveAs(file);
  const backup = JSON.parse(fs.readFileSync(file, 'utf8'));
  ok('export: file .json con tutti i dati', /^fitkia-backup-\d{4}-\d{2}-\d{2}\.json$/.test(download.suggestedFilename()) && backup.app === 'fitkia' && backup.habits.weight.length === 2 && Array.isArray(backup.customFoods), download.suggestedFilename());
  await $('#delete-button').click(); await $('#delete-confirm').click();
  await page.waitForSelector('#onboarding-section', { state: 'visible' });
  ok('cancellazione: tutto sparito, torna l\'onboarding', (await page.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('fitkia')).length)) === 0);
  // import: prima un file sbagliato, poi quello vero (si va in Impostazioni dopo aver ricreato un profilo)
  await page.fill('[name=name]', 'X'); await page.fill('#onboarding-form [name=age]', '25'); await page.fill('#onboarding-form [name=weightKg]', '60'); await page.fill('#onboarding-form [name=heightCm]', '165'); await page.selectOption('#onboarding-form [name=sex]', 'female'); await page.click('#onboarding-form button[type=submit]');
  await page.waitForSelector('#app-section', { state: 'visible' }); await $('#welcome-close').click(); await $('[data-nav=settings]').click();
  fs.writeFileSync('/tmp/junk.json', '{"app":"altro"}');
  await $('#import-file').setInputFiles('/tmp/junk.json');
  await page.waitForFunction(() => document.getElementById('import-error').textContent.length > 0);
  ok('import file sbagliato: messaggio e nessuna sostituzione', /non è un backup/.test(await text('#import-error')) && !(await $('#import-dialog').evaluate(d => d.open)), await text('#import-error'));
  await $('#import-file').setInputFiles(file);
  await page.waitForFunction(() => document.getElementById('import-dialog').open);
  ok('import: riepilogo prima di sovrascrivere', /Mattia · \d+ giorni di diario · 2 pesi/.test(await text('#import-summary')), await text('#import-summary'));
  await $('#import-confirm').click();
  await $('[data-nav=home]').click();
  await page.waitForSelector('[data-view=home]', { state: 'visible' });   // hashchange è asincrono: si aspetta la vista
  { const w = await text('#welcome-header'), e = await text('#kcal-eaten'); ok('import: dati ripristinati (profilo e consumate)', w === 'Ciao, Mattia' && e === eatenBefore, `prima=${eatenBefore} dopo=${e} saluto=${w} view=${await page.evaluate(() => location.hash)}`); }

  // --- cambio giorno a mezzanotte
  if (page.clock) {
    await page.clock.install({ time: new Date('2026-11-12T23:59:00') }); await page.reload(); await page.waitForSelector('#app-section', { state: 'visible' });
    const d1 = await text('#date-header');
    await page.clock.setFixedTime(new Date('2026-11-13T00:02:00'));
    await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
    ok('MEZZANOTTE: tornando sull\'app la data si aggiorna', d1 !== (await text('#date-header')), d1 + ' -> ' + await text('#date-header'));
  } else console.log('SKIP mezzanotte: page.clock non disponibile');

  // --- tema e movimento: tre contesti con profilo già salvato
  const profile = JSON.stringify({ v: 1, data: { name: 'Mattia', age: 30, weightKg: 80, heightCm: 180, sex: 'male', goal: 'lose', activity: 'sedentary' } });
  const probe = async options => {
    const c = await browser.newContext({ viewport: { width: 390, height: 844 }, ...options });
    await c.route('**/cdn.tailwindcss.com/**', r => r.fulfill({ contentType: 'text/javascript', body: `window.tailwind = {}; (()=>{const s=document.createElement('style'); s.textContent=${JSON.stringify('.hidden{display:none !important}' + theme)}; document.head.appendChild(s);})();` }));
    await c.route('**/fonts.googleapis.com/**', r => r.fulfill({ contentType: 'text/css', body: '' }));
    await c.addInitScript(p => { if (!localStorage.getItem('fitkia:v1:profile')) localStorage.setItem('fitkia:v1:profile', p); window.__vt = 0; const o = document.startViewTransition?.bind(document); if (o) document.startViewTransition = (...a) => { window.__vt++; return o(...a); }; }, profile);
    const p = await c.newPage(); await p.goto('http://localhost:3000/'.replace('http://localhost:3000/', process.env.BASE_URL || 'http://localhost:3000/'));
    await p.waitForSelector('#app-section', { state: 'visible' });
    await p.click('[data-nav=diary]'); await p.waitForSelector('[data-view=diary]', { state: 'visible' });
    const r = { vt: await p.evaluate(() => window.__vt), surface: await p.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--surface').trim()), scheme: await p.evaluate(() => getComputedStyle(document.documentElement).colorScheme) };
    await c.close(); return r;
  };
  const light = await probe({ colorScheme: 'light' }), dark = await probe({ colorScheme: 'dark' }), reduced = await probe({ reducedMotion: 'reduce' });
  ok('TEMA: chiaro = superficie bianca', light.surface === '255 255 255' && light.scheme === 'light', JSON.stringify(light));
  ok('TEMA: scuro = superficie scura, segue il telefono', dark.surface === '24 33 28' && dark.scheme === 'dark', JSON.stringify(dark));
  ok('cambio vista con dissolvenza (se supportata)', light.vt >= 1, 'startViewTransition chiamata ' + light.vt + ' volta/e');
  ok('"riduci animazioni": nessuna transizione e la navigazione funziona', reduced.vt === 0, 'chiamate: ' + reduced.vt);

  ok('nessun errore JavaScript in tutto il percorso', errors.length === 0, errors.join(' | '));
  console.log(`\n${results.filter(Boolean).length}/${results.length} controlli superati`);
  await browser.close(); process.exit(results.every(Boolean) ? 0 : 1);
})().catch(e => { console.error('ERRORE DEL TEST:', e.message.split('\n')[0]); process.exit(2); });
