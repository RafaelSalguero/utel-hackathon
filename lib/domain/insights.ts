import { groupBy, meanBy, omit, orderBy, sumBy } from 'lodash-es';
import type { ChatDataset, ChatProduct } from '@/lib/ai/schemas';
import type { ProductPair } from './basket';
import type { EventPlan } from './calendar';
import { SEMANAS, percentChange, revenue, salesInWindow } from './metrics';
import type { ElasticityTable } from './whatif';
import type { ProductGroup, ProductVariant, StoreData } from './types';

// ---- Building the dataset (client) -------------------------------------------
// Per-product aggregates for the chat tools. Like the summary, the raw CSV never
// leaves the browser.

const MAX_NOMBRE = 80;

const limitText = (texto: string, max = MAX_NOMBRE): string => (texto.length > max ? `${texto.slice(0, max - 1)}…` : texto);

const round = (n: number, decimales = 2): number => Number(n.toFixed(decimales));
const roundOrNull = (n: number | null, decimales = 2): number | null => (n === null ? null : round(n, decimales));

// Profit needs a cost for every variant; otherwise it is unknown.
const profit30d = (variantes: readonly ProductVariant[]): number | null =>
  variantes.every((v) => v.producto.costo !== null)
    ? sumBy(variantes, (v) => v.metrics.ingresos30d - v.metrics.unidades30d * (v.producto.costo ?? 0))
    : null;

const averageCost = (variantes: readonly ProductVariant[]): number | null => {
  const conCosto = variantes.filter((v) => v.producto.costo !== null);
  return conCosto.length === 0 ? null : meanBy(conCosto, (v) => v.producto.costo ?? 0);
};

const minOrNull = (valores: readonly (number | null)[]): number | null => {
  const conocidos = valores.filter((v): v is number => v !== null);
  return conocidos.length === 0 ? null : Math.min(...conocidos);
};

const toChatProduct = (g: ProductGroup, elasticidades: ElasticityTable): ChatProduct => {
  const costo = averageCost(g.variantes);
  const elasticidad = elasticidades.porProducto[g.id] ?? { valor: elasticidades.tienda, fuente: elasticidades.fuenteTienda };
  return {
    sku: g.id,
    producto: limitText(g.producto),
    categoria: g.categoria.nombre,
    precio: g.precio,
    costo: roundOrNull(costo),
    margen: costo === null || g.precio === 0 ? null : round((g.precio - costo) / g.precio),
    roi: costo === null || costo === 0 ? null : round((g.precio - costo) / costo),
    stock: g.stock,
    valorInventario: round(g.stock * g.precio, 0),
    unidades7d: sumBy(g.variantes, (v) => v.metrics.unidades7d),
    unidades30d: g.unidades30d,
    ingresos30d: round(g.ingresos30d, 0),
    ganancia30d: roundOrNull(profit30d(g.variantes), 0),
    tendencia3Semanas: roundOrNull(g.tendencia),
    estado: g.status,
    diasParaAgotarse: roundOrNull(g.critica?.metrics.diasParaAgotarse ?? minOrNull(g.variantes.map((v) => v.metrics.diasParaAgotarse)), 1),
    diasSinVenta: minOrNull(g.variantes.map((v) => v.metrics.diasSinVenta)),
    ventaDiaria: round(sumBy(g.variantes, (v) => v.metrics.ventaDiaria), 3),
    ventaDiaria8Semanas: round(sumBy(g.ventasPorSemana) / (SEMANAS * 7), 3),
    elasticidad: elasticidad.valor,
    elasticidadFuente: elasticidad.fuente,
    variantes: g.variantes.map((v) => ({
      variante: limitText(v.producto.variante ?? v.producto.sku, 40),
      stock: v.producto.stock,
      unidades30d: v.metrics.unidades30d,
      estado: v.metrics.status,
      diasParaAgotarse: roundOrNull(v.metrics.diasParaAgotarse, 1),
    })),
  };
};

// The calendar plan without its matching rules (RegExp does not travel as JSON).
export const toChatEvent = (plan: EventPlan): ChatDataset['eventos'][number] => ({
  id: plan.evento.id,
  nombre: plan.evento.nombre,
  fecha: plan.fecha,
  diasRestantes: plan.diasRestantes,
  duracion: plan.evento.duracion,
  aproximada: plan.evento.aproximada,
  clave: plan.clave.map((p) => ({
    sku: p.sku,
    producto: limitText(p.producto),
    stock: p.stock,
    ventaDiaria: round(p.ventaDiaria, 2),
    diasParaAgotarse: roundOrNull(p.diasParaAgotarse, 1),
    preparacion: p.preparacion,
    pedirMas: p.pedirMas,
  })),
  oportunidades: plan.oportunidades.map((o) => ({ ...o, producto: limitText(o.producto) })),
});

const toChatPair = (p: ProductPair): ChatDataset['compras'][number] => ({
  a: { sku: p.a.sku, producto: limitText(p.a.producto), estado: p.a.estado },
  b: { sku: p.b.sku, producto: limitText(p.b.producto), estado: p.b.estado },
  pedidos: p.pedidos,
  lift: p.lift,
  confianzaAB: p.confianzaAB,
  confianzaBA: p.confianzaBA,
  oportunidad: p.oportunidad,
});

export const MAX_PAREJAS = 30;

export const buildChatDataset = (
  data: StoreData,
  grupos: readonly ProductGroup[],
  kpis: ChatDataset['kpis'],
  extras: {
    readonly elasticidades: ElasticityTable;
    readonly parejas: readonly ProductPair[];
    readonly eventos: readonly EventPlan[];
  },
): ChatDataset => {
  const productos = grupos.map((g) => toChatProduct(g, extras.elasticidades));
  const categoriaPorSku = Object.fromEntries(data.productos.map((p) => [p.sku, p.categoria.nombre]));
  const ventasPorCategoria = groupBy(data.ventas, (v) => categoriaPorSku[v.sku] ?? 'Otros');
  const productosPorCategoria = groupBy(productos, 'categoria');
  const fechaCorte = data.fechaCorte;

  const categorias = Object.entries(productosPorCategoria).map(([categoria, lista]) => {
    const ventas = ventasPorCategoria[categoria] ?? [];
    const ventana = (dias: number, offset: number) => (fechaCorte === null ? 0 : revenue(salesInWindow(ventas, fechaCorte, dias, offset)));
    const ventas7d = ventana(7, 0);
    const ventas30d = ventana(30, 0);
    const ganancias = lista.map((p) => p.ganancia30d);
    return {
      categoria,
      productos: lista.length,
      ventas7d: round(ventas7d, 0),
      cambio7d: roundOrNull(percentChange(ventas7d, ventana(7, 1))),
      ventas30d: round(ventas30d, 0),
      cambio30d: roundOrNull(percentChange(ventas30d, ventana(30, 1))),
      ganancia30d: ganancias.every((g) => g !== null) ? round(sumBy(ganancias, (g) => g ?? 0), 0) : null,
      valorInventario: round(sumBy(lista, 'valorInventario'), 0),
      porAgotarse: lista.filter((p) => p.estado === 'por_agotarse').length,
      lentos: lista.filter((p) => p.estado === 'lento').length,
    };
  });

  return {
    fechaCorte,
    kpis,
    elasticidadTienda: extras.elasticidades.tienda,
    compras: extras.parejas.slice(0, MAX_PAREJAS).map((p) => toChatPair(p)),
    eventos: extras.eventos.map((e) => toChatEvent(e)),
    productos,
    categorias: orderBy(categorias, 'ventas30d', 'desc'),
  };
};

// ---- Queries (server tools) ---------------------------------------------------

export const CRITERIOS = [
  'unidades30d',
  'unidades7d',
  'ingresos30d',
  'ganancia30d',
  'roi',
  'margen',
  'tendencia3Semanas',
  'stock',
  'valorInventario',
] as const;

export type Criterio = (typeof CRITERIOS)[number];

const normalize = (texto: string): string => texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const sinVariantes = (p: ChatProduct): Omit<ChatProduct, 'variantes'> => omit(p, 'variantes');

export const storeOverview = (ds: ChatDataset) => ({
  fechaCorte: ds.fechaCorte,
  ...ds.kpis,
  porAgotarse: ds.productos.filter((p) => p.estado === 'por_agotarse').length,
  lentos: ds.productos.filter((p) => p.estado === 'lento').length,
  sanos: ds.productos.filter((p) => p.estado === 'sano').length,
  categorias: ds.categorias.length,
});

export const rankProducts = (
  ds: ChatDataset,
  opts: { readonly criterio: Criterio; readonly orden: 'desc' | 'asc'; readonly limite: number; readonly categoria?: string | null },
) => {
  const categoria = opts.categoria ? normalize(opts.categoria) : null;
  const enCategoria = categoria === null ? ds.productos : ds.productos.filter((p) => normalize(p.categoria) === categoria);
  const conDato = enCategoria.filter((p) => p[opts.criterio] !== null);
  const ordenados = orderBy(conDato, (p) => p[opts.criterio], opts.orden);
  return {
    criterio: opts.criterio,
    // e.g. products without a cost have no ROI; say so instead of hiding them silently
    productosSinDato: enCategoria.length - conDato.length,
    productos: ordenados.slice(0, opts.limite).map((p) => sinVariantes(p)),
  };
};

export const findProducts = (ds: ChatDataset, consulta: string): readonly ChatProduct[] => {
  const q = normalize(consulta.trim());
  const palabras = q.split(/\s+/).filter((w) => w.length > 2);
  const exactos = ds.productos.filter((p) => normalize(p.producto).includes(q) || normalize(p.sku) === q);
  if (exactos.length > 0) return exactos.slice(0, 5);
  return ds.productos.filter((p) => palabras.some((w) => normalize(p.producto).includes(w))).slice(0, 5);
};

export const pairsFor = (ds: ChatDataset, producto: string | null) => {
  if (producto === null || producto.trim() === '') return ds.compras.slice(0, 10);
  const q = normalize(producto.trim());
  return ds.compras.filter((p) => normalize(p.a.producto).includes(q) || normalize(p.b.producto).includes(q) || p.a.sku === producto || p.b.sku === producto).slice(0, 10);
};

export const riskProducts = (ds: ChatDataset, tipo: 'por_agotarse' | 'lento' | 'todos') => {
  const porAgotarse = orderBy(
    ds.productos.filter((p) => p.estado === 'por_agotarse'),
    (p) => p.diasParaAgotarse ?? 0,
  );
  const lentos = orderBy(
    ds.productos.filter((p) => p.estado === 'lento'),
    'valorInventario',
    'desc',
  );
  return {
    ...(tipo !== 'lento' ? { porAgotarse } : {}),
    ...(tipo !== 'por_agotarse' ? { lentos: lentos.map((p) => sinVariantes(p)) } : {}),
  };
};
