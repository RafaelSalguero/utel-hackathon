import { groupBy, maxBy, meanBy, orderBy, sumBy } from 'lodash-es';
import type { ChatDataset, ChatProduct } from '@/lib/ai/schemas';
import type { ProductGroup, Sale } from './types';

// "¿Y si…?" projections. All numbers are computed here; the AI only chooses and explains.
// Model: 30 days ahead, at the product's current pace, never selling more than the stock.

export const HORIZONTE = 30;

// ---- Price response, estimated from the store's own discounted sales -----------------
// elasticidad e: a discount of d% moves sales by about e*d% (and a price rise of d% by -e*d%).

export const ELASTICIDAD_SUPUESTA = 1.5;
const ELASTICIDAD_MIN = 0.3;
const ELASTICIDAD_MAX = 4;
const MIN_DIAS_PRODUCTO = 10; // discounted days needed to trust a product's own estimate
const MIN_DIAS_TIENDA = 5;

export type FuenteElasticidad = 'producto' | 'tienda' | 'supuesto';

type Estimacion = { readonly valor: number; readonly diasConDescuento: number } | null;

const clamp = (n: number): number => Math.min(ELASTICIDAD_MAX, Math.max(ELASTICIDAD_MIN, n));

// Compares units per selling day on days the product was discounted vs. days at full price.
const estimateFor = (ventas: readonly Sale[], precioPorSku: Readonly<Record<string, number>>): Estimacion => {
  const porDia = groupBy(ventas, 'fecha');
  const dias = Object.values(porDia).map((lineas) => ({
    unidades: sumBy(lineas, 'cantidad'),
    descuento: maxBy(lineas.map((l) => 1 - l.precioVenta / (precioPorSku[l.sku] ?? l.precioVenta)), (d) => d) ?? 0,
  }));
  const conDescuento = dias.filter((d) => d.descuento > 0.01);
  const sinDescuento = dias.filter((d) => d.descuento <= 0.01);
  if (conDescuento.length < MIN_DIAS_TIENDA || sinDescuento.length < MIN_DIAS_TIENDA) return null;
  const subida = meanBy(conDescuento, 'unidades') / meanBy(sinDescuento, 'unidades') - 1;
  return { valor: subida / meanBy(conDescuento, 'descuento'), diasConDescuento: conDescuento.length };
};

export type ElasticityTable = {
  readonly tienda: number;
  readonly fuenteTienda: 'tienda' | 'supuesto';
  readonly porProducto: Readonly<Record<string, { readonly valor: number; readonly fuente: FuenteElasticidad }>>;
};

export const estimateElasticities = (ventas: readonly Sale[], grupos: readonly ProductGroup[]): ElasticityTable => {
  const precioPorSku = Object.fromEntries(grupos.flatMap((g) => g.variantes.map((v) => [v.producto.sku, v.producto.precio] as const)));
  const ventasPorSku = groupBy(ventas, 'sku');
  const estimaciones = grupos.map((g) => ({
    id: g.id,
    est: estimateFor(g.variantes.flatMap((v) => ventasPorSku[v.producto.sku] ?? []), precioPorSku),
  }));
  const validas = estimaciones.flatMap((e) => (e.est && e.est.valor > 0 ? [e.est.valor] : []));
  const ordenadas = [...validas].sort((x, y) => x - y);
  const mediana = ordenadas.length === 0 ? null : ordenadas[Math.floor(ordenadas.length / 2)];
  const tienda = mediana === null ? ELASTICIDAD_SUPUESTA : clamp(mediana);
  const fuenteTienda: 'tienda' | 'supuesto' = mediana === null ? 'supuesto' : 'tienda';
  const porProducto = Object.fromEntries(
    estimaciones.map(({ id, est }) =>
      est && est.diasConDescuento >= MIN_DIAS_PRODUCTO && est.valor > 0
        ? [id, { valor: Number(clamp(est.valor).toFixed(2)), fuente: 'producto' as const }]
        : [id, { valor: Number(tienda.toFixed(2)), fuente: fuenteTienda }],
    ),
  );
  return { tienda: Number(tienda.toFixed(2)), fuenteTienda, porProducto };
};

// ---- Simulator ----------------------------------------------------------------

export type Escenario =
  | { readonly tipo: 'precio'; readonly cambioPct: number } // -10 = 10% discount
  | { readonly tipo: 'reposicion'; readonly unidades: number }
  | { readonly tipo: 'demanda'; readonly aumentoPct: number }; // e.g. a sales event

export type Resultado30d = {
  readonly precio: number;
  readonly ritmoDiario: number;
  readonly unidades: number;
  readonly ingresos: number;
  readonly ganancia: number | null;
  readonly diasParaAgotarse: number | null;
  readonly ventasPerdidas: number; // demand left unserved because stock ran out
};

export type Proyeccion = {
  readonly antes: Resultado30d;
  readonly despues: Resultado30d;
  readonly supuestos: readonly string[];
};

type Simulable = Pick<ChatProduct, 'precio' | 'costo' | 'stock' | 'ventaDiaria' | 'ventaDiaria8Semanas' | 'elasticidad' | 'elasticidadFuente'>;

const round = (n: number, d = 0): number => Number(n.toFixed(d));

const project = (precio: number, costo: number | null, stock: number, ritmo: number): Resultado30d => {
  const demanda = ritmo * HORIZONTE;
  const unidades = Math.min(stock, demanda);
  return {
    precio: round(precio),
    ritmoDiario: round(ritmo, 2),
    unidades: round(unidades),
    ingresos: round(unidades * precio),
    ganancia: costo === null ? null : round(unidades * (precio - costo)),
    diasParaAgotarse: ritmo === 0 ? null : round(stock / ritmo, 1),
    ventasPerdidas: round(Math.max(0, demanda - stock)),
  };
};

const FUENTE_TEXTO: Readonly<Record<FuenteElasticidad, string>> = {
  producto: 'estimada de las ventas con descuento de este producto',
  tienda: 'estimada de las ventas con descuento de toda tu tienda',
  supuesto: 'valor supuesto: no hay suficientes ventas con descuento para estimarla',
};

export const simulate = (p: Simulable, escenario: Escenario): Proyeccion => {
  const usaHistorico = p.ventaDiaria === 0;
  const ritmo = usaHistorico ? p.ventaDiaria8Semanas : p.ventaDiaria;
  const base = [
    `Ritmo base: ${round(ritmo, 2)} piezas por día (${usaHistorico ? 'promedio de 8 semanas, porque no se ha vendido en 4' : 'últimos 28 días'}).`,
    `Proyección a ${HORIZONTE} días sin reabastecer${escenario.tipo === 'reposicion' ? ' (salvo la reposición)' : ''}.`,
  ];
  const antes = project(p.precio, p.costo, p.stock, ritmo);

  if (escenario.tipo === 'precio') {
    const factor = Math.max(0, Math.min(3, 1 - (p.elasticidad * escenario.cambioPct) / 100));
    return {
      antes,
      despues: project(p.precio * (1 + escenario.cambioPct / 100), p.costo, p.stock, ritmo * factor),
      supuestos: [...base, `Elasticidad ${p.elasticidad}: cada 10% de cambio de precio mueve ~${round(p.elasticidad * 10)}% las ventas (${FUENTE_TEXTO[p.elasticidadFuente]}).`],
    };
  }
  if (escenario.tipo === 'reposicion') {
    return { antes, despues: project(p.precio, p.costo, p.stock + escenario.unidades, ritmo), supuestos: base };
  }
  return {
    antes,
    despues: project(p.precio, p.costo, p.stock, ritmo * (1 + escenario.aumentoPct / 100)),
    supuestos: [...base, `Demanda ${escenario.aumentoPct >= 0 ? '+' : ''}${escenario.aumentoPct}% sobre el ritmo base.`],
  };
};

// ---- Candidate scenarios for the "¿Y si…?" cards -------------------------------------

export type WhatIfCandidate = {
  readonly id: string;
  readonly pregunta: string; // neutral wording; the AI rewrites it
  readonly sku: string;
  readonly producto: string;
  readonly escenario: Escenario;
  readonly proyeccion: Proyeccion;
};

const candidate = (id: string, pregunta: string, p: ChatProduct, escenario: Escenario): WhatIfCandidate => ({
  id,
  pregunta,
  sku: p.sku,
  producto: p.producto,
  escenario,
  proyeccion: simulate(p, escenario),
});

export const whatIfCandidates = (ds: ChatDataset): readonly WhatIfCandidate[] => {
  const vendiendo = ds.productos.filter((p) => p.ventaDiaria > 0);
  const tendencia = maxBy(
    vendiendo.filter((p) => p.estado !== 'lento' && (p.tendencia3Semanas ?? 0) > 0.15),
    (p) => p.tendencia3Semanas ?? 0,
  );
  // The slow product that was selling most recently: a discount has a pace to work with.
  const lento = maxBy(
    ds.productos.filter((p) => p.estado === 'lento' && p.ventaDiaria8Semanas > 0),
    'ventaDiaria8Semanas',
  );
  const critico = maxBy(
    ds.productos.filter((p) => p.estado === 'por_agotarse' && p.stock > 0),
    'unidades30d',
  );
  const holgado = maxBy(
    vendiendo.filter((p) => p.estado === 'sano' && p.stock / p.ventaDiaria > 45),
    (p) => p.elasticidad * p.ingresos30d,
  );
  const top = orderBy(vendiendo, 'unidades30d', 'desc')[0];
  // Restock for the next date: the first key product that sells out before or during it.
  const evento = ds.eventos.find((e) => e.diasRestantes <= 45 && e.clave.some((c) => c.pedirMas > 0));
  const faltante = evento?.clave.find((c) => c.pedirMas > 0);
  const deEvento = faltante ? ds.productos.find((p) => p.sku === faltante.sku) : undefined;

  const lista: readonly (WhatIfCandidate | null)[] = [
    tendencia ? candidate('subir_tendencia', `¿Y si subo 10% el precio de ${tendencia.producto}?`, tendencia, { tipo: 'precio', cambioPct: 10 }) : null,
    lento ? candidate('liquidar_lento', `¿Y si liquido ${lento.producto} con 30% de descuento?`, lento, { tipo: 'precio', cambioPct: -30 }) : null,
    critico
      ? candidate('reponer_critico', `¿Y si repongo ${critico.producto} para todo el mes?`, critico, {
          tipo: 'reposicion',
          unidades: Math.max(1, Math.ceil(critico.ventaDiaria * HORIZONTE - critico.stock)),
        })
      : null,
    critico ? candidate('descuento_critico', `¿Y si pongo 10% de descuento en ${critico.producto}?`, critico, { tipo: 'precio', cambioPct: -10 }) : null,
    holgado ? candidate('descuento_holgado', `¿Y si bajo 15% el precio de ${holgado.producto}?`, holgado, { tipo: 'precio', cambioPct: -15 }) : null,
    evento && faltante && deEvento && deEvento.sku !== critico?.sku
      ? candidate('reponer_evento', `¿Y si repongo ${faltante.pedirMas} piezas de ${deEvento.producto} antes de ${evento.nombre}?`, deEvento, {
          tipo: 'reposicion',
          unidades: faltante.pedirMas,
        })
      : null,
    top && top.sku !== tendencia?.sku ? candidate('subir_top', `¿Y si subo 5% el precio de ${top.producto}?`, top, { tipo: 'precio', cambioPct: 5 }) : null,
  ];
  return lista.filter((c): c is WhatIfCandidate => c !== null);
};
