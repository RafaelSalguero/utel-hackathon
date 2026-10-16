import { countBy, maxBy, orderBy, sumBy } from 'lodash-es';
import type { ChatDataset, SummaryInput } from '@/lib/ai/schemas';
import { buildChatDataset } from '@/lib/domain/insights';
import { CATEGORIES } from '@/lib/domain/categories';
import {
  dailySeries,
  metricsBySku,
  percentChange,
  revenue,
  salesInWindow,
  toProductGroups,
  type DailyPoint,
} from '@/lib/domain/metrics';
import { STATUS_PRIORIDAD } from '@/lib/domain/status';
import { buildSummaryInput } from '@/lib/domain/summary';
import type { Category, ProductGroup, StockStatus, StoreData } from '@/lib/domain/types';

export const selectGroups = (data: StoreData): readonly ProductGroup[] => {
  const metricas = metricsBySku(data.productos, data.ventas, data.fechaCorte);
  return toProductGroups(data.productos, metricas);
};

export type Kpis = {
  readonly hayVentas: boolean;
  readonly ventas7d: number;
  readonly cambio7d: number | null;
  readonly ventas30d: number;
  readonly cambio30d: number | null;
  readonly unidadesStock: number;
  readonly valorInventario: number;
  readonly productos: number;
};

export const selectKpis = (data: StoreData, grupos: readonly ProductGroup[]): Kpis => {
  const unidadesStock = sumBy(data.productos, 'stock');
  const valorInventario = sumBy(data.productos, (p) => p.stock * p.precio);
  const fechaCorte = data.fechaCorte;
  if (fechaCorte === null) {
    return { hayVentas: false, ventas7d: 0, cambio7d: null, ventas30d: 0, cambio30d: null, unidadesStock, valorInventario, productos: grupos.length };
  }
  const ventas7d = revenue(salesInWindow(data.ventas, fechaCorte, 7));
  const ventas7dAntes = revenue(salesInWindow(data.ventas, fechaCorte, 7, 1));
  const ventas30d = revenue(salesInWindow(data.ventas, fechaCorte, 30));
  const ventas30dAntes = revenue(salesInWindow(data.ventas, fechaCorte, 30, 1));
  return {
    hayVentas: true,
    ventas7d,
    cambio7d: percentChange(ventas7d, ventas7dAntes),
    ventas30d,
    cambio30d: percentChange(ventas30d, ventas30dAntes),
    unidadesStock,
    valorInventario,
    productos: grupos.length,
  };
};

export const selectAlerts = (grupos: readonly ProductGroup[]): { readonly porAgotarse: number; readonly lentos: number } => {
  const conteo = countBy(grupos, 'status');
  return { porAgotarse: conteo.por_agotarse ?? 0, lentos: conteo.lento ?? 0 };
};

export const selectDailySeries = (data: StoreData, dias = 14): readonly DailyPoint[] =>
  data.fechaCorte === null ? [] : dailySeries(data.ventas, data.fechaCorte, dias);

export const selectTopProducts = (grupos: readonly ProductGroup[], n = 5): readonly ProductGroup[] =>
  orderBy(grupos.filter((g) => g.unidades30d > 0), ['unidades30d', 'ingresos30d'], ['desc', 'desc']).slice(0, n);

export type StatusFilter = 'todos' | StockStatus;

export const selectByStatus = (grupos: readonly ProductGroup[], filtro: StatusFilter): readonly ProductGroup[] => {
  const filtrados = filtro === 'todos' ? grupos : grupos.filter((g) => g.status === filtro);
  return orderBy(filtrados, [(g) => STATUS_PRIORIDAD[g.status], (g) => g.critica?.metrics.diasParaAgotarse ?? Infinity, 'producto']);
};

const normalize = (texto: string): string => texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export const selectBySearch = (grupos: readonly ProductGroup[], busqueda: string): readonly ProductGroup[] => {
  const q = normalize(busqueda.trim());
  if (q === '') return grupos;
  return grupos.filter(
    (g) => normalize(g.producto).includes(q) || g.variantes.some((v) => normalize(v.producto.sku).includes(q)),
  );
};

export const selectProduct = (grupos: readonly ProductGroup[], sku: string): ProductGroup | null =>
  grupos.find((g) => g.variantes.some((v) => v.producto.sku === sku)) ?? null;

export const selectCategories = (grupos: readonly ProductGroup[]): readonly { readonly categoria: Category; readonly productos: number }[] => {
  const conteo = countBy(grupos, (g) => g.categoria.id);
  const lista = Object.entries(conteo).map(([id, productos]) => ({ categoria: CATEGORIES[id as Category['id']], productos }));
  return orderBy(lista, 'productos', 'desc');
};

// Promo suggestion: the product with the strongest upward trend that still has stock.
export const selectSuggestedPromo = (grupos: readonly ProductGroup[]): ProductGroup | null => {
  const candidatos = grupos.filter((g) => g.stock > 0 && g.tendencia !== null && g.tendencia > 0 && sumBy(g.ventasPorSemana.slice(-3)) >= 3);
  return maxBy(candidatos, 'tendencia') ?? selectTopProducts(grupos, 1)[0] ?? grupos[0] ?? null;
};

const toAiKpis = (kpis: Kpis): SummaryInput['kpis'] => ({
  ventas7d: Math.round(kpis.ventas7d),
  cambio7d: kpis.cambio7d === null ? null : Number(kpis.cambio7d.toFixed(2)),
  ventas30d: Math.round(kpis.ventas30d),
  cambio30d: kpis.cambio30d === null ? null : Number(kpis.cambio30d.toFixed(2)),
  unidadesStock: kpis.unidadesStock,
  valorInventario: Math.round(kpis.valorInventario),
  productos: kpis.productos,
});

export const selectSummaryInput = (data: StoreData, grupos: readonly ProductGroup[], kpis: Kpis): SummaryInput =>
  buildSummaryInput(data, grupos, toAiKpis(kpis));

export const selectChatDataset = (data: StoreData, grupos: readonly ProductGroup[], kpis: Kpis): ChatDataset =>
  buildChatDataset(data, grupos, toAiKpis(kpis));
