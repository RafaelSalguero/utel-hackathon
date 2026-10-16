import Link from 'next/link';
import { ProductThumb } from '@/components/inventory/ProductThumb';
import layout from '@/components/layout/Page.module.css';
import type { ProductGroup } from '@/lib/domain/types';
import { formatMoney, formatNumber } from '@/lib/format/money';
import styles from './TopProducts.module.css';

export function TopProducts({ grupos }: { readonly grupos: readonly ProductGroup[] }) {
  return (
    <section className={layout.card} aria-labelledby="mas-vendidos">
      <h2 id="mas-vendidos" className={layout.cardTitle}>
        Más vendidos · 30 días
      </h2>
      <ol className={styles.list}>
        {grupos.map((g) => (
          <li key={g.id}>
            <Link href={`/inventario/${encodeURIComponent(g.id)}`} className={styles.row}>
              <ProductThumb categoria={g.categoria} />
              <span className={styles.info}>
                <span className={styles.name}>{g.producto}</span>
                <span className={styles.meta}>{formatNumber(g.unidades30d)} unidades</span>
              </span>
              <span className={styles.amount}>{formatMoney(g.ingresos30d)}</span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
