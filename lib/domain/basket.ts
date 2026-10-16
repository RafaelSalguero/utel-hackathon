import { countBy, groupBy, orderBy, uniq } from 'lodash-es';
import type { ProductGroup, Sale, StockStatus } from './types';

// "Lo que se compra junto": products that share orders more often than chance.
// lift = P(A and B) / (P(A) P(B)); lift 3 means they appear together 3x more than if unrelated.

export const MIN_PEDIDOS = 8;
export const MIN_LIFT = 1.5;

export type Oportunidad = 'liquidar_en_kit' | 'riesgo_doble' | 'kit';

export type ProductPair = {
  readonly a: { readonly sku: string; readonly producto: string; readonly emoji: string; readonly estado: StockStatus };
  readonly b: { readonly sku: string; readonly producto: string; readonly emoji: string; readonly estado: StockStatus };
  readonly pedidos: number; // orders with both
  readonly lift: number;
  readonly confianzaAB: number; // share of A's orders that also have B
  readonly confianzaBA: number;
  readonly oportunidad: Oportunidad;
};

const opportunity = (a: StockStatus, b: StockStatus): Oportunidad => {
  if (a === 'lento' || b === 'lento') return 'liquidar_en_kit';
  if (a === 'por_agotarse' || b === 'por_agotarse') return 'riesgo_doble';
  return 'kit';
};

export const frequentPairs = (
  ventas: readonly Sale[],
  grupos: readonly ProductGroup[],
  opts: { readonly minPedidos: number; readonly minLift: number } = { minPedidos: MIN_PEDIDOS, minLift: MIN_LIFT },
): readonly ProductPair[] => {
  const grupoPorSku = Object.fromEntries(grupos.flatMap((g) => g.variantes.map((v) => [v.producto.sku, g] as const)));
  const pedidos = Object.values(groupBy(ventas, 'idPedido')).map((lineas) =>
    uniq(lineas.flatMap((l) => (grupoPorSku[l.sku] ? [grupoPorSku[l.sku].id] : []))).sort(),
  );
  const total = pedidos.length;
  const porProducto = countBy(pedidos.flat());
  const parejas = countBy(pedidos.flatMap((ids) => ids.flatMap((a, i) => ids.slice(i + 1).map((b) => `${a}|${b}`))));
  const grupoPorId = Object.fromEntries(grupos.map((g) => [g.id, g]));

  const lista = Object.entries(parejas).flatMap(([clave, juntos]) => {
    const [idA, idB] = clave.split('|');
    const lift = (juntos * total) / (porProducto[idA] * porProducto[idB]);
    if (juntos < opts.minPedidos || lift < opts.minLift) return [];
    const ga = grupoPorId[idA];
    const gb = grupoPorId[idB];
    return [
      {
        a: { sku: ga.id, producto: ga.producto, emoji: ga.categoria.emoji, estado: ga.status },
        b: { sku: gb.id, producto: gb.producto, emoji: gb.categoria.emoji, estado: gb.status },
        pedidos: juntos,
        lift: Number(lift.toFixed(1)),
        confianzaAB: Number((juntos / porProducto[idA]).toFixed(2)),
        confianzaBA: Number((juntos / porProducto[idB]).toFixed(2)),
        oportunidad: opportunity(ga.status, gb.status),
      },
    ];
  });
  return orderBy(lista, ['pedidos', 'lift'], ['desc', 'desc']);
};

// For the dashboard: actionable pairs first (slow stock to move, shared stockout risk), then volume.
export const featuredPairs = (pares: readonly ProductPair[], n = 4): readonly ProductPair[] => {
  const prioridad: Readonly<Record<Oportunidad, number>> = { liquidar_en_kit: 0, riesgo_doble: 1, kit: 2 };
  const unoDeCada = Object.values(groupBy(pares, 'oportunidad')).map((lista) => lista[0]);
  const resto = pares.filter((p) => !unoDeCada.includes(p));
  return [...orderBy(unoDeCada, (p) => prioridad[p.oportunidad]), ...resto].slice(0, n);
};
