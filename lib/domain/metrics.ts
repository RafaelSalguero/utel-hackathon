import { groupBy, maxBy, minBy, orderBy, sumBy } from 'lodash-es';
import { addDays, daysBetween } from '@/lib/format/dates';
import { STATUS_PRIORIDAD, toStatus } from './status';
import type { Product, ProductGroup, ProductMetrics, ProductVariant, Sale, StockStatus } from './types';

export const VENTANA_RITMO = 28;
export const SEMANAS = 8;

// A window of `dias` days ending at `fechaCorte`, moved back `offset` whole windows.
// offset 0 = the current window, offset 1 = the previous one.
export const isInWindow = (fecha: string, fechaCorte: string, dias: number, offset = 0): boolean => {
  const fin = addDays(fechaCorte, -dias * offset);
  const inicio = addDays(fin, -dias);
  return fecha > inicio && fecha <= fin;
};

export const salesInWindow = (
  ventas: readonly Sale[],
  fechaCorte: string,
  dias: number,
  offset = 0,
): readonly Sale[] => ventas.filter((v) => isInWindow(v.fecha, fechaCorte, dias, offset));

export const revenue = (ventas: readonly Sale[]): number => sumBy(ventas, (v) => v.cantidad * v.precioVenta);

export const units = (ventas: readonly Sale[]): number => sumBy(ventas, 'cantidad');

export const percentChange = (actual: number, anterior: number): number | null =>
  anterior === 0 ? null : (actual - anterior) / anterior;

export const daysUntilStockout = (stock: number, ventaDiaria: number): number | null =>
  ventaDiaria === 0 ? null : stock / ventaDiaria;

export const weeklyUnits = (ventas: readonly Sale[], fechaCorte: string, semanas = SEMANAS): readonly number[] =>
  Array.from({ length: semanas }, (_, i) => units(salesInWindow(ventas, fechaCorte, 7, semanas - 1 - i)));

// Last 3 weeks vs. the 3 before them.
export const weeklyTrend = (semanas: readonly number[]): number | null => {
  const recientes = sumBy(semanas.slice(-3));
  const anteriores = sumBy(semanas.slice(-6, -3));
  return percentChange(recientes, anteriores);
};

export const productMetrics = (
  producto: Product,
  ventasDelSku: readonly Sale[],
  fechaCorte: string | null,
): ProductMetrics => {
  if (fechaCorte === null || ventasDelSku.length === 0) {
    const sinVentas = { diasParaAgotarse: null, unidades30d: 0 };
    return {
      sku: producto.sku,
      unidades7d: 0,
      unidades30d: 0,
      ingresos30d: 0,
      ventaDiaria: 0,
      diasParaAgotarse: null,
      diasSinVenta: null,
      ventasPorSemana: Array.from({ length: SEMANAS }, () => 0),
      status: toStatus(sinVentas, producto.stock),
    };
  }

  const ventas30d = salesInWindow(ventasDelSku, fechaCorte, 30);
  const unidades30d = units(ventas30d);
  const ventaDiaria = units(salesInWindow(ventasDelSku, fechaCorte, VENTANA_RITMO)) / VENTANA_RITMO;
  const diasParaAgotarse = daysUntilStockout(producto.stock, ventaDiaria);
  const ultima = maxBy(ventasDelSku, 'fecha');

  return {
    sku: producto.sku,
    unidades7d: units(salesInWindow(ventasDelSku, fechaCorte, 7)),
    unidades30d,
    ingresos30d: revenue(ventas30d),
    ventaDiaria,
    diasParaAgotarse,
    diasSinVenta: ultima ? daysBetween(ultima.fecha, fechaCorte) : null,
    ventasPorSemana: weeklyUnits(ventasDelSku, fechaCorte),
    status: toStatus({ diasParaAgotarse, unidades30d }, producto.stock),
  };
};

export const metricsBySku = (
  productos: readonly Product[],
  ventas: readonly Sale[],
  fechaCorte: string | null,
): Readonly<Record<string, ProductMetrics>> => {
  const ventasPorSku = groupBy(ventas, 'sku');
  const entradas = productos.map((p) => [p.sku, productMetrics(p, ventasPorSku[p.sku] ?? [], fechaCorte)] as const);
  return Object.fromEntries(entradas);
};

const worstStatus = (variantes: readonly ProductVariant[]): StockStatus => {
  const peor = minBy(variantes, (v) => STATUS_PRIORIDAD[v.metrics.status]);
  return peor ? peor.metrics.status : 'sano';
};

const sumWeeks = (variantes: readonly ProductVariant[]): readonly number[] =>
  Array.from({ length: SEMANAS }, (_, i) => sumBy(variantes, (v) => v.metrics.ventasPorSemana[i] ?? 0));

// Variants share the product name; the group is what the owner sees in lists.
export const toProductGroups = (
  productos: readonly Product[],
  metricas: Readonly<Record<string, ProductMetrics>>,
): readonly ProductGroup[] => {
  const porNombre = groupBy(productos, 'producto');
  return Object.values(porNombre).map((enArchivo) => {
    const miembros = orderBy(enArchivo, 'sku'); // VES-001-1, -2, -3: the store's own variant order
    const variantes = miembros.map((producto) => ({ producto, metrics: metricas[producto.sku] }));
    const primera = miembros[0];
    const criticas = variantes.filter((v) => v.metrics.status === 'por_agotarse');
    const ventasPorSemana = sumWeeks(variantes);
    return {
      id: primera.sku,
      producto: primera.producto,
      categoria: primera.categoria,
      precio: minBy(miembros, 'precio')?.precio ?? primera.precio,
      stock: sumBy(miembros, 'stock'),
      variantes,
      unidades30d: sumBy(variantes, (v) => v.metrics.unidades30d),
      ingresos30d: sumBy(variantes, (v) => v.metrics.ingresos30d),
      ventasPorSemana,
      status: worstStatus(variantes),
      critica: minBy(criticas, (v) => v.metrics.diasParaAgotarse ?? Infinity) ?? null,
      tendencia: weeklyTrend(ventasPorSemana),
    };
  });
};

export type DailyPoint = { readonly fecha: string; readonly total: number };

export const dailySeries = (ventas: readonly Sale[], fechaCorte: string, dias = 14): readonly DailyPoint[] => {
  const porFecha = groupBy(salesInWindow(ventas, fechaCorte, dias), 'fecha');
  return Array.from({ length: dias }, (_, i) => {
    const fecha = addDays(fechaCorte, i - dias + 1);
    return { fecha, total: revenue(porFecha[fecha] ?? []) };
  });
};
