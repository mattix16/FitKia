// Icone SVG monocromatiche (stile Apple Salute): un tratto solo, colore da `currentColor`.
// Sono stringhe COSTANTI scritte da noi (nessun dato dell'utente): si possono mettere in innerHTML.
const svg = (paths, size = 22) => `<svg aria-hidden="true" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none"
  stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;

const PATHS = {
  // Pasti
  breakfast: '<path d="M4 9.5h12v4.5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z"/><path d="M16 10.5h1.5a2.5 2.5 0 0 1 0 5H16"/><path d="M8 3.5c0 1 1 1.2 1 2.2S8 7 8 7M12 3.5c0 1 1 1.2 1 2.2S12 7 12 7"/>',
  lunch: '<path d="M6 3v5a3 3 0 0 0 6 0V3M9 3v18"/><path d="M18 21V3c-2.2 1.4-3.5 4-3.5 7.5V14H18"/>',
  dinner: '<path d="M19.5 14.5A8 8 0 1 1 9.5 4.5a6.5 6.5 0 0 0 10 10z"/><path d="M17 3.5v3M15.5 5h3"/>',
  snack: '<path d="M12 7.5c-1.6-1.1-5-1.2-6.4 1.4-1.5 2.8-.6 7.5 1.9 10.3 1.3 1.5 3 1.7 4.5.9 1.5.8 3.2.6 4.5-.9 2.5-2.8 3.4-7.5 1.9-10.3C17 6.3 13.6 6.4 12 7.5z"/><path d="M12 7.5c0-2 .9-3.6 3-4.3"/>',
  // Suggerimenti e riquadri della home
  repeat: '<path d="M4 11a8 8 0 0 1 13.7-5.2L20 8M20 3.5V8h-4.5"/><path d="M20 13a8 8 0 0 1-13.7 5.2L4 16M4 20.5V16h4.5"/>',
  weight: '<rect x="4" y="4" width="16" height="16" rx="4"/><path d="M8.5 10a3.5 3.5 0 0 1 7 0"/><path d="M12 10l1.3-2"/>',
  water: '<path d="M12 3.5s6 6.3 6 10.6a6 6 0 0 1-12 0C6 9.8 12 3.5 12 3.5z"/><path d="M9.5 14.5a2.5 2.5 0 0 0 2.5 2.5"/>',
  supplements: '<path d="M10.6 20.4a4.9 4.9 0 0 1-7-7l6.8-6.8a4.9 4.9 0 0 1 7 7z"/><path d="M7 10l7 7"/>',
};

/** Colore (token della palette) di ogni icona: come in Salute, ogni categoria ha la sua tinta pastello. */
export const ICON_TONES = { breakfast: 'carbs', lunch: 'brand', dinner: 'protein', snack: 'fat', repeat: 'brand', log: 'brand',
  weight: 'carbs', water: 'water', supplements: 'protein' };

/** `<span class="tone-icon">` = quadratino tinto con il glifo. Il colore lo calcola il CSS da --tone (vedi index.html). */
export function toneIcon(name, { size = 22, box = 'h-10 w-10 rounded-xl' } = {}) {
  const key = name === 'log' ? 'lunch' : name;
  return `<span aria-hidden="true" class="tone-icon ${box}" style="--tone: var(--${ICON_TONES[name]})">${svg(PATHS[key], size)}</span>`;
}
