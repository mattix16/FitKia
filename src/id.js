// Identificatore univoco. crypto.randomUUID esiste solo in contesti sicuri (HTTPS/localhost): altrimenti un ripiego.
export const newId = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
