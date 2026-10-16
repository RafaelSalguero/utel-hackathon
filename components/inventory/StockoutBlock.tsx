import { sumBy } from 'lodash-es';
import { daysUntilStockout } from '@/lib/domain/metrics';
import type { ProductGroup } from '@/lib/domain/types';
import { formatNumber } from '@/lib/format/money';
import styles from './StockoutBlock.module.css';

const formatDias = (dias: number): string => {
  if (dias < 1) return 'Menos de 1 día';
  const redondeo = Math.round(dias);
  return `~${redondeo} ${redondeo === 1 ? 'día' : 'días'}`;
};

const describe = (g: ProductGroup): { readonly titulo: string; readonly detalle: string } => {
  const varias = g.variantes.length > 1;

  if (g.status === 'por_agotarse' && g.critica) {
    const { producto, metrics } = g.critica;
    const cual = varias && producto.variante ? ` (${producto.variante})` : '';
    if (producto.stock === 0) return { titulo: 'Agotado', detalle: `${cual ? `La variante${cual}` : 'Este producto'} se agotó y se sigue pidiendo` };
    return { titulo: formatDias(metrics.diasParaAgotarse ?? 0), detalle: `para agotarse${cual} al ritmo actual` };
  }

  if (g.status === 'lento') {
    const lentas = g.variantes.filter((v) => v.metrics.status === 'lento');
    const dias = Math.min(...lentas.map((v) => v.metrics.diasSinVenta ?? Infinity));
    const cual = varias && lentas.length < g.variantes.length ? ` en ${lentas.map((v) => v.producto.variante).join(', ')}` : '';
    if (!Number.isFinite(dias)) return { titulo: 'Sin ventas', detalle: `no se ha vendido nunca${cual}` };
    return { titulo: `${dias} días`, detalle: `sin ventas${cual}` };
  }

  const ventaDiaria = sumBy(g.variantes, (v) => v.metrics.ventaDiaria);
  const dias = daysUntilStockout(g.stock, ventaDiaria);
  if (dias === null) return { titulo: 'Sin ventas', detalle: 'en las últimas 4 semanas' };
  return { titulo: formatDias(dias), detalle: 'de inventario al ritmo actual' };
};

export function StockoutBlock({ grupo }: { readonly grupo: ProductGroup }) {
  const { titulo, detalle } = describe(grupo);
  return (
    <section className={styles.block} data-status={grupo.status}>
      <div>
        <p className={styles.big}>{titulo}</p>
        <p className={styles.detail}>{detalle}</p>
      </div>
      <div className={styles.units}>
        <p className={styles.unitsValue}>{formatNumber(grupo.stock)}</p>
        <p className={styles.detail}>{grupo.stock === 1 ? 'unidad' : 'unidades'}</p>
      </div>
    </section>
  );
}
