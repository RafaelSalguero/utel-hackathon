// Dates travel as 'YYYY-MM-DD' strings and are computed in UTC so the
// results do not depend on the browser's time zone.

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'] as const;
const DIA_MS = 86_400_000;

const toUtc = (fecha: string): number => Date.parse(`${fecha}T00:00:00Z`);

export const isIsoDate = (texto: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(texto)) return false;
  const ms = toUtc(texto);
  return !Number.isNaN(ms) && new Date(ms).toISOString().slice(0, 10) === texto;
};

export const addDays = (fecha: string, dias: number): string =>
  new Date(toUtc(fecha) + dias * DIA_MS).toISOString().slice(0, 10);

export const daysBetween = (desde: string, hasta: string): number =>
  Math.round((toUtc(hasta) - toUtc(desde)) / DIA_MS);

export const formatShortDate = (fecha: string): string => {
  const [, mes, dia] = fecha.split('-').map(Number);
  return `${dia} ${MESES[mes - 1]}`;
};

export const formatLongDate = (fecha: string): string => `${formatShortDate(fecha)} ${fecha.slice(0, 4)}`;
