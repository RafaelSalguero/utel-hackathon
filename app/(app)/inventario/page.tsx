'use client';

import { Search } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { Suspense, useMemo, useState } from 'react';
import { Filters } from '@/components/inventory/Filters';
import { ProductRow } from '@/components/inventory/ProductRow';
import layout from '@/components/layout/Page.module.css';
import { Input } from '@/components/ui/input';
import { useGroups } from '@/hooks/useStore';
import type { CategoryId } from '@/lib/domain/types';
import { selectByStatus, selectBySearch, selectCategories, type StatusFilter } from '@/state/selectors';
import styles from './page.module.css';

const ESTADOS: readonly StatusFilter[] = ['todos', 'por_agotarse', 'lento', 'sano'];

const toStatusFilter = (valor: string | null): StatusFilter =>
  ESTADOS.find((e) => e === valor) ?? 'todos';

function Inventory() {
  const params = useSearchParams();
  const grupos = useGroups();
  const [estado, setEstado] = useState<StatusFilter>(toStatusFilter(params.get('estado')));
  const [categoria, setCategoria] = useState<CategoryId | 'todas'>('todas');
  const [busqueda, setBusqueda] = useState('');

  const categorias = useMemo(() => selectCategories(grupos).map((c) => c.categoria), [grupos]);

  // Counts reflect search and category, so each chip tells how many results it would show.
  const base = useMemo(() => {
    const porCategoria = categoria === 'todas' ? grupos : grupos.filter((g) => g.categoria.id === categoria);
    return selectBySearch(porCategoria, busqueda);
  }, [grupos, categoria, busqueda]);

  const conteos = useMemo(
    () => ({
      todos: base.length,
      por_agotarse: base.filter((g) => g.status === 'por_agotarse').length,
      lento: base.filter((g) => g.status === 'lento').length,
      sano: base.filter((g) => g.status === 'sano').length,
    }),
    [base],
  );

  const visibles = useMemo(() => selectByStatus(base, estado), [base, estado]);

  return (
    <>
      <div className={styles.search}>
        <Search size={20} aria-hidden className={styles.searchIcon} />
        <Input
          type="search"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar producto o SKU"
          aria-label="Buscar producto o SKU"
          className={styles.searchInput}
        />
      </div>

      <Filters
        estado={estado}
        onEstado={setEstado}
        conteos={conteos}
        categoria={categoria}
        onCategoria={setCategoria}
        categorias={categorias}
      />

      <p className={layout.srOnly} aria-live="polite">
        {visibles.length} productos
      </p>

      {visibles.length > 0 ? (
        <ul className={styles.list}>
          {visibles.map((g) => (
            <li key={g.id}>
              <ProductRow grupo={g} />
            </li>
          ))}
        </ul>
      ) : (
        <div className={`${layout.card} ${styles.empty}`}>
          <p>No hay productos con estos filtros.</p>
        </div>
      )}
    </>
  );
}

export default function InventoryPage() {
  return (
    <main className={`${layout.page} ${layout.withNav}`}>
      <h1 className={layout.title}>Inventario</h1>
      <Suspense>
        <Inventory />
      </Suspense>
    </main>
  );
}
