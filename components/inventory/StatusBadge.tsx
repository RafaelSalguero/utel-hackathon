import { STATUS_LABEL } from '@/lib/domain/status';
import type { StockStatus } from '@/lib/domain/types';
import styles from './StatusBadge.module.css';

// Text plus a shape (circle / square), so the status never depends on color alone.
export function StatusBadge({ status }: { readonly status: StockStatus }) {
  return (
    <span className={styles.badge} data-status={status}>
      <span className={styles.mark} aria-hidden />
      {STATUS_LABEL[status]}
    </span>
  );
}
