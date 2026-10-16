import { maxBy } from 'lodash-es';
import layout from '@/components/layout/Page.module.css';
import { STATUS_LABEL } from '@/lib/domain/status';
import type { ProductVariant } from '@/lib/domain/types';
import styles from './VariantBars.module.css';

export function VariantBars({ variantes }: { readonly variantes: readonly ProductVariant[] }) {
  const maximo = Math.max(maxBy(variantes, (v) => v.producto.stock)?.producto.stock ?? 0, 1);
  return (
    <section className={layout.card} aria-labelledby="stock-variante">
      <h2 id="stock-variante" className={layout.cardTitle}>
        Stock por variante
      </h2>
      <ul className={styles.list}>
        {variantes.map((v) => (
          <li key={v.producto.sku} className={styles.row}>
            <span className={styles.label}>{v.producto.variante ?? v.producto.sku}</span>
            <span className={styles.track} aria-hidden>
              <span
                className={styles.fill}
                data-status={v.metrics.status}
                style={{ width: `${(v.producto.stock / maximo) * 100}%` }}
              />
            </span>
            <span className={styles.value}>
              {v.producto.stock}
              <span className={layout.srOnly}> piezas, {STATUS_LABEL[v.metrics.status]}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
