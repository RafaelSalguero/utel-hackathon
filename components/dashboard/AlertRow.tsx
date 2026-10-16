import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import type { StockStatus } from '@/lib/domain/types';
import styles from './AlertRow.module.css';

export function AlertRow({ status, texto }: { readonly status: StockStatus; readonly texto: string }) {
  return (
    <Link href={`/inventario?estado=${status}`} className={styles.row} data-status={status}>
      <span className={styles.mark} aria-hidden />
      <span className={styles.text}>{texto}</span>
      <span className={styles.see}>
        Ver <ChevronRight size={18} aria-hidden />
      </span>
    </Link>
  );
}
