// Word-by-word reveal for chat answers. On Claude Sonnet 5.5 the answer that
// follows a tool call reaches us in one burst (the API holds a tool turn's text
// until it knows no tool call follows), so the client paces what it shows.
// The step grows with the backlog: a burst drains in ~2-3 s, a trickle shows at once.

export const REVEAL_TICK_MS = 30;
const MIN_CHARS = 4;
const DRAIN_TICKS = 25;

// How many characters of `recibido` to show on the next tick, ending on a word boundary.
export const nextReveal = (recibido: string, mostrado: number): number => {
  const pendiente = recibido.length - mostrado;
  if (pendiente <= 0) return recibido.length;
  const corte = mostrado + Math.max(MIN_CHARS, Math.ceil(pendiente / DRAIN_TICKS));
  if (corte >= recibido.length) return recibido.length;
  const espacio = recibido.indexOf(' ', corte);
  return espacio === -1 ? recibido.length : espacio;
};
