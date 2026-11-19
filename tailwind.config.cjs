// Configurazione di Tailwind per Fitkia (la stessa che prima stava inline in index.html, per il CDN).
// È .cjs perché il progetto è "type": "module" e Tailwind legge la config come CommonJS.

// I colori leggono variabili CSS (definite in src/styles/input.css): cambiano da sole in modalità scura.
// <alpha-value> permette es. text-muted/60.
const COLORS = ['canvas', 'surface', 'ink', 'muted', 'faint', 'track', 'brand', 'brand-hover', 'deep', 'tint', 'action', 'on-action', 'danger',
  'accent', 'water', 'protein', 'carbs', 'fat', 'line'];

/** @type {import('tailwindcss').Config} */
module.exports = {
  // Tailwind genera SOLO le classi che trova scritte per intero in questi file (anche dentro le stringhe JS).
  // Per questo le classi variabili nel codice sono sempre stringhe intere ('bg-danger'), mai costruite a pezzi ('bg-' + nome).
  content: ['./index.html', './src/**/*.js'],
  theme: {
    extend: {
      // Font di sistema: su iPhone/Mac è San Francisco (come le app Apple), altrove il font nativo. Nessun download.
      fontFamily: { sans: ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Text"', '"Segoe UI"', 'Roboto', 'system-ui', 'sans-serif'] },
      colors: Object.fromEntries(COLORS.map(name => [name, `rgb(var(--${name}) / <alpha-value>)`])),
      transitionTimingFunction: { spring: 'cubic-bezier(.2,.8,.2,1)' },
    },
  },
};
