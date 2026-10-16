import { orderBy, sumBy } from 'lodash-es';
import { addDays, daysBetween } from '@/lib/format/dates';
import type { CategoryId, ProductGroup } from './types';

// Mexican retail calendar. Dates that move every year use weekday rules; the ones
// set by the industry each year (Buen Fin, Hot Sale) are approximations.

type Regla =
  | { readonly tipo: 'fija'; readonly mes: number; readonly dia: number }
  // n-th weekday of the month (n = -1: the last one), shifted by `desplazamiento` days
  | { readonly tipo: 'nesimo'; readonly mes: number; readonly diaSemana: number; readonly n: number; readonly desplazamiento: number };

export type RetailEvent = {
  readonly id: string;
  readonly nombre: string;
  readonly emoji: string;
  readonly regla: Regla;
  readonly duracion: number; // days the buying lasts
  readonly aproximada: boolean;
  readonly todaLaTienda: boolean; // sitewide sale: every product counts
  readonly categorias: readonly CategoryId[];
  readonly palabras: RegExp | null; // product names that fit the date (accent-free, lowercase)
};

export const EVENTOS: readonly RetailEvent[] = [
  { id: 'reyes', nombre: 'Día de Reyes', emoji: '👑', regla: { tipo: 'fija', mes: 1, dia: 6 }, duracion: 1, aproximada: false, todaLaTienda: false, categorias: ['juguetes'], palabras: /rosca|juguete/ },
  { id: 'san_valentin', nombre: 'San Valentín', emoji: '💝', regla: { tipo: 'fija', mes: 2, dia: 14 }, duracion: 1, aproximada: false, todaLaTienda: false, categorias: ['belleza'], palabras: /perfume|collar|chocolate|labial|vela|regalo/ },
  { id: 'dia_nino', nombre: 'Día del Niño', emoji: '🧸', regla: { tipo: 'fija', mes: 4, dia: 30 }, duracion: 1, aproximada: false, todaLaTienda: false, categorias: ['juguetes', 'deportes'], palabras: null },
  { id: 'dia_madres', nombre: 'Día de las Madres', emoji: '💐', regla: { tipo: 'fija', mes: 5, dia: 10 }, duracion: 1, aproximada: false, todaLaTienda: false, categorias: ['belleza', 'accesorios', 'hogar'], palabras: /regalo/ },
  { id: 'hot_sale', nombre: 'Hot Sale', emoji: '🔥', regla: { tipo: 'nesimo', mes: 5, diaSemana: 1, n: -1, desplazamiento: 0 }, duracion: 9, aproximada: true, todaLaTienda: true, categorias: [], palabras: null },
  { id: 'dia_padre', nombre: 'Día del Padre', emoji: '👔', regla: { tipo: 'nesimo', mes: 6, diaSemana: 0, n: 3, desplazamiento: 0 }, duracion: 1, aproximada: false, todaLaTienda: false, categorias: ['electronica', 'accesorios'], palabras: /gorra|cartera|cinturon|reloj|playera|tenis/ },
  { id: 'fiestas_patrias', nombre: 'Fiestas Patrias', emoji: '🇲🇽', regla: { tipo: 'fija', mes: 9, dia: 15 }, duracion: 2, aproximada: false, todaLaTienda: false, categorias: ['alimentos'], palabras: /tequila|mezcal|bandera|rebozo|mexican/ },
  { id: 'dia_muertos', nombre: 'Día de Muertos', emoji: '🕯️', regla: { tipo: 'fija', mes: 11, dia: 1 }, duracion: 2, aproximada: false, todaLaTienda: false, categorias: [], palabras: /calaver|vela|chocolate|cafe|pan de muerto|cempas|catrina|papel picado|incienso|copal/ },
  // Buen Fin ends on the Revolution Day holiday (3rd Monday of November) and starts the Thursday before.
  { id: 'buen_fin', nombre: 'El Buen Fin', emoji: '🛍️', regla: { tipo: 'nesimo', mes: 11, diaSemana: 1, n: 3, desplazamiento: -4 }, duracion: 5, aproximada: true, todaLaTienda: true, categorias: [], palabras: null },
  { id: 'navidad', nombre: 'Navidad', emoji: '🎄', regla: { tipo: 'fija', mes: 12, dia: 24 }, duracion: 1, aproximada: false, todaLaTienda: false, categorias: ['juguetes', 'belleza', 'accesorios'], palabras: /regalo|tarjeta|pijama|bufanda|chamarra|sudadera|perfume/ },
];

const pad = (n: number): string => String(n).padStart(2, '0');

export const eventDate = (regla: Regla, anio: number): string => {
  if (regla.tipo === 'fija') return `${anio}-${pad(regla.mes)}-${pad(regla.dia)}`;
  const primero = `${anio}-${pad(regla.mes)}-01`;
  const diaSemanaPrimero = new Date(`${primero}T00:00:00Z`).getUTCDay();
  const primeraOcurrencia = addDays(primero, (regla.diaSemana - diaSemanaPrimero + 7) % 7);
  if (regla.n > 0) return addDays(primeraOcurrencia, 7 * (regla.n - 1) + regla.desplazamiento);
  // last occurrence: step back from the first day of the next month
  const siguienteMes = regla.mes === 12 ? `${anio + 1}-01-01` : `${anio}-${pad(regla.mes + 1)}-01`;
  const diaSemanaSiguiente = new Date(`${siguienteMes}T00:00:00Z`).getUTCDay();
  const ultima = addDays(siguienteMes, -(((diaSemanaSiguiente - regla.diaSemana + 6) % 7) + 1));
  return addDays(ultima, regla.desplazamiento);
};

export type UpcomingEvent = { readonly evento: RetailEvent; readonly fecha: string; readonly diasRestantes: number };

export const upcomingEvents = (hoy: string, cuantos = 3): readonly UpcomingEvent[] => {
  const anio = Number(hoy.slice(0, 4));
  const candidatos = [anio, anio + 1].flatMap((a) =>
    EVENTOS.map((evento) => {
      const fecha = eventDate(evento.regla, a);
      return { evento, fecha, diasRestantes: daysBetween(hoy, fecha) };
    }),
  );
  return orderBy(candidatos.filter((c) => c.diasRestantes >= 0), 'diasRestantes').slice(0, cuantos);
};

// ---- Is the store ready for the date? ------------------------------------------

export type Preparacion = 'se_agota_antes' | 'se_agota_durante' | 'listo';

export type EventProduct = {
  readonly sku: string;
  readonly producto: string;
  readonly emoji: string;
  readonly stock: number;
  readonly ventaDiaria: number;
  readonly diasParaAgotarse: number | null;
  readonly preparacion: Preparacion;
  readonly pedirMas: number; // units to last through the event at the current pace
};

export type EventPlan = UpcomingEvent & {
  readonly clave: readonly EventProduct[]; // best sellers that fit the date
  readonly oportunidades: readonly { readonly sku: string; readonly producto: string; readonly stock: number }[]; // slow stock that fits the date
};

const normalize = (texto: string): string => texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export const fitsEvent = (evento: RetailEvent, g: ProductGroup): boolean =>
  evento.todaLaTienda || evento.categorias.includes(g.categoria.id) || (evento.palabras?.test(normalize(g.producto)) ?? false);

const toEventProduct = (g: ProductGroup, diasHastaFin: number, diasRestantes: number): EventProduct => {
  const ventaDiaria = sumBy(g.variantes, (v) => v.metrics.ventaDiaria);
  const dias = ventaDiaria === 0 ? null : g.stock / ventaDiaria;
  const preparacion: Preparacion =
    dias === null || dias >= diasHastaFin ? 'listo' : dias < diasRestantes ? 'se_agota_antes' : 'se_agota_durante';
  return {
    sku: g.id,
    producto: g.producto,
    emoji: g.categoria.emoji,
    stock: g.stock,
    ventaDiaria,
    diasParaAgotarse: dias,
    preparacion,
    pedirMas: Math.max(0, Math.ceil(ventaDiaria * diasHastaFin - g.stock)),
  };
};

export const planEvent = (proximo: UpcomingEvent, grupos: readonly ProductGroup[]): EventPlan => {
  const encajan = grupos.filter((g) => fitsEvent(proximo.evento, g));
  const diasHastaFin = proximo.diasRestantes + proximo.evento.duracion;
  const vendidos = orderBy(encajan.filter((g) => g.unidades30d > 0), 'unidades30d', 'desc').slice(0, 3);
  const lentos = orderBy(encajan.filter((g) => g.status === 'lento'), (g) => g.stock * g.precio, 'desc').slice(0, 2);
  return {
    ...proximo,
    clave: vendidos.map((g) => toEventProduct(g, diasHastaFin, proximo.diasRestantes)),
    oportunidades: proximo.evento.todaLaTienda ? [] : lentos.map((g) => ({ sku: g.id, producto: g.producto, stock: g.stock })),
  };
};
