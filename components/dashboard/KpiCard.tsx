import { formatPercent } from '@/lib/format/money';
import styles from './KpiCard.module.css';

type Props = {
  readonly label: string;
  readonly value: string;
  readonly cambio?: number | null;
  readonly comparacion?: string;
  readonly pie?: string;
  readonly inverse?: boolean;
};

export function KpiCard({ label, value, cambio, comparacion, pie, inverse = false }: Props) {
  const tieneCambio = cambio !== undefined && cambio !== null;
  const sube = tieneCambio && cambio >= 0;
  return (
    <div className={styles.card} data-inverse={inverse}>
      <p className={styles.label}>{label}</p>
      <p className={styles.value}>{value}</p>
      {tieneCambio && (
        <p className={styles.delta} data-trend={sube ? 'up' : 'down'}>
          <span aria-hidden>{sube ? '▲' : '▼'}</span>
          <span className={styles.srOnly}>{sube ? 'Subió' : 'Bajó'}</span> {formatPercent(cambio)} {comparacion}
        </p>
      )}
      {cambio === null && comparacion && <p className={styles.foot}>Sin datos del periodo anterior</p>}
      {pie && <p className={styles.foot}>{pie}</p>}
    </div>
  );
}
