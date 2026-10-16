import type { Category } from '@/lib/domain/types';
import styles from './ProductThumb.module.css';

export function ProductThumb({ categoria, size = 'md' }: { readonly categoria: Category; readonly size?: 'md' | 'lg' }) {
  return (
    <span className={styles.thumb} data-size={size} role="img" aria-label={categoria.nombre}>
      {categoria.emoji}
    </span>
  );
}
