'use client';

import { ChevronDown } from 'lucide-react';
import type { Category, CategoryId } from '@/lib/domain/types';
import type { StatusFilter } from '@/state/selectors';
import styles from './Filters.module.css';

type Props = {
  readonly estado: StatusFilter;
  readonly onEstado: (estado: StatusFilter) => void;
  readonly conteos: Readonly<Record<StatusFilter, number>>;
  readonly categoria: CategoryId | 'todas';
  readonly onCategoria: (categoria: CategoryId | 'todas') => void;
  readonly categorias: readonly Category[];
};

const OPCIONES: readonly { readonly id: StatusFilter; readonly label: string }[] = [
  { id: 'todos', label: 'Todos' },
  { id: 'por_agotarse', label: 'Por agotarse' },
  { id: 'lento', label: 'Lentos' },
  { id: 'sano', label: 'Sanos' },
];

export function Filters({ estado, onEstado, conteos, categoria, onCategoria, categorias }: Props) {
  return (
    <div className={styles.filters} role="group" aria-label="Filtros">
      {OPCIONES.map((o) => (
        <button
          key={o.id}
          type="button"
          className={styles.chip}
          aria-pressed={estado === o.id}
          onClick={() => onEstado(o.id)}
        >
          {o.label} · {conteos[o.id]}
        </button>
      ))}
      <label className={styles.selectChip} data-active={categoria !== 'todas'}>
        <span className={styles.srOnly}>Categoría</span>
        <select value={categoria} onChange={(e) => onCategoria(e.target.value as CategoryId | 'todas')} className={styles.select}>
          <option value="todas">Categoría</option>
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>
              {c.emoji} {c.nombre}
            </option>
          ))}
        </select>
        <ChevronDown size={16} aria-hidden className={styles.chevron} />
      </label>
    </div>
  );
}
