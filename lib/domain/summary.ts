import { groupBy, orderBy, sumBy } from 'lodash-es';
import type { SummaryInput } from '@/lib/ai/schemas';
import { percentChange, revenue, salesInWindow } from './metrics';
import type { ProductGroup, ProductVariant, StoreData } from './types';

const MAX_NOMBRE = 80;

const limitText = (texto: string, max = MAX_NOMBRE): string => (texto.length > max ? `${texto.slice(0, max - 1)}…` : texto);

const variantName = (v: ProductVariant): string =>
  limitText(v.producto.variante ? `${v.producto.producto} (${v.producto.variante})` : v.producto.producto);

const round = (n: number, decimales: number): number => Number(n.toFixed(decimales));

export type SummaryKpis = SummaryInput['kpis'];

// What is sent to the AI: aggregates only, never the raw CSV.
export const buildSummaryInput = (
  data: StoreData,
  grupos: readonly ProductGroup[],
  kpis: SummaryKpis,
): SummaryInput => {
  const variantes = grupos.flatMap((g) => g.variantes);

  const criticas = orderBy(
    variantes.filter((v) => v.metrics.status === 'por_agotarse'),
    (v) => v.metrics.diasParaAgotarse ?? 0,
  ).slice(0, 10);

  const lentas = orderBy(
    variantes.filter((v) => v.metrics.status === 'lento'),
    (v) => v.producto.stock * v.producto.precio,
    'desc',
  ).slice(0, 10);

  const porSku = Object.fromEntries(data.productos.map((p) => [p.sku, p.categoria.nombre]));
  const fechaCorte = data.fechaCorte;
  const ventasPorCategoria = groupBy(data.ventas, (v) => porSku[v.sku] ?? 'Otros');
  const categorias =
    fechaCorte === null
      ? []
      : orderBy(
          Object.entries(ventasPorCategoria).map(([categoria, ventas]) => {
            const actual = revenue(salesInWindow(ventas, fechaCorte, 7));
            const anterior = revenue(salesInWindow(ventas, fechaCorte, 7, 1));
            const cambio = percentChange(actual, anterior);
            return { categoria, ventas7d: round(actual, 0), cambio7d: cambio === null ? null : round(cambio, 2) };
          }),
          'ventas7d',
          'desc',
        ).slice(0, 5);

  const conTendencia = grupos.flatMap((g) =>
    g.tendencia === null || sumBy(g.ventasPorSemana.slice(-6)) < 6 ? [] : [{ producto: limitText(g.producto), cambio3Semanas: round(g.tendencia, 2) }],
  );
  const tendencias = orderBy(conTendencia, (t) => Math.abs(t.cambio3Semanas), 'desc').slice(0, 6);

  return {
    fechaCorte,
    kpis,
    porAgotarse: criticas.map((v) => ({
      sku: limitText(v.producto.sku, 40),
      producto: variantName(v),
      stock: v.producto.stock,
      ventaDiaria: round(v.metrics.ventaDiaria, 2),
      diasParaAgotarse: round(v.metrics.diasParaAgotarse ?? 0, 1),
    })),
    lentos: lentas.map((v) => ({
      sku: limitText(v.producto.sku, 40),
      producto: variantName(v),
      stock: v.producto.stock,
      diasSinVenta: v.metrics.diasSinVenta,
    })),
    categorias,
    tendencias,
  };
};
