import Link from 'next/link';
import type { ProductGroup } from '@/lib/domain/types';
import { formatMoney, formatNumber } from '@/lib/format/money';
import { ProductThumb } from './ProductThumb';
import styles from './ProductRow.module.css';
import { StatusBadge } from './StatusBadge';

export function ProductRow({ grupo }: { readonly grupo: ProductGroup }) {
  return (
    <Link href={`/inventario/${encodeURIComponent(grupo.id)}`} className={styles.row}>
      <ProductThumb categoria={grupo.categoria} />
      <span className={styles.info}>
        <span className={styles.name}>{grupo.producto}</span>
        <span className={styles.meta}>
          {formatMoney(grupo.precio)} · {formatNumber(grupo.stock)} en stock
        </span>
      </span>
      <StatusBadge status={grupo.status} />
    </Link>
  );
}
