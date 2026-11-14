// Piccole utilità per i form, condivise da più schermate.

/** Riempie una <select> da un array di { id, label, hint? } e seleziona `selectedId`.
 *  new Option(testo, valore) crea le voci senza innerHTML: il testo non viene mai interpretato come HTML. */
export function fillOptions(select, options, selectedId) {
  select.replaceChildren(...options.map(({ id, label, hint }) => {
    const option = new Option(hint ? `${label} — ${hint}` : label, id);
    option.selected = id === selectedId;
    return option;
  }));
}