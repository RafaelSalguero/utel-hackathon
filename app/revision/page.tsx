'use client';

import { FileSpreadsheet, TriangleAlert } from 'lucide-react';
import Link from 'next/link';
import { useMemo } from 'react';
import layout from '@/components/layout/Page.module.css';
import { RequireData } from '@/components/layout/RequireData';
import { TopBar } from '@/components/layout/TopBar';
import { Button } from '@/components/ui/button';
import { useStore } from '@/hooks/useStore';
import { formatLongDate } from '@/lib/format/dates';
import { formatBytes, formatNumber } from '@/lib/format/money';
import { selectCategories, selectGroups } from '@/state/selectors';
import styles from './page.module.css';

const ERRORES_VISIBLES = 8;

function Review() {
  const { state } = useStore();
  if (state.status !== 'listo') throw new Error('Review rendered without data');
  const { data, archivo } = state;

  const grupos = useMemo(() => selectGroups(data), [data]);
  const categorias = useMemo(() => selectCategories(grupos), [grupos]);
  const pedidos = useMemo(() => new Set(data.ventas.map((v) => v.idPedido)).size, [data.ventas]);
  const primeraVenta = data.ventas.reduce<string | null>((min, v) => (min === null || v.fecha < min ? v.fecha : min), null);

  const conteos = [
    { valor: grupos.length, etiqueta: 'productos' },
    { valor: data.productos.length, etiqueta: 'SKUs y variantes' },
    { valor: data.ventas.length, etiqueta: 'líneas de venta' },
    { valor: pedidos, etiqueta: 'pedidos' },
  ];

  return (
    <main className={layout.page}>
      <TopBar href="/" label="Cambiar archivo" />

      <div>
        <h1 className={layout.title}>Revisa tus datos</h1>
        <p className={layout.subtitle}>Esto es lo que encontramos en tu archivo.</p>
      </div>

      <section className={`${layout.card} ${styles.file}`}>
        <span className={styles.fileIcon} aria-hidden>
          <FileSpreadsheet size={22} />
        </span>
        <div className={styles.fileInfo}>
          <p className={styles.fileName}>{archivo.nombre}</p>
          <p className={styles.fileMeta}>
            {formatBytes(archivo.tamano)}
            {data.fechaCorte && primeraVenta && ` · ventas del ${formatLongDate(primeraVenta)} al ${formatLongDate(data.fechaCorte)}`}
          </p>
        </div>
      </section>

      <div className={layout.pair}>
        {conteos.map((c) => (
          <div key={c.etiqueta} className={layout.card}>
            <p className={styles.countValue}>{formatNumber(c.valor)}</p>
            <p className={styles.countLabel}>{c.etiqueta}</p>
          </div>
        ))}
      </div>

      {data.ventas.length === 0 && (
        <p className={layout.notice}>Tu archivo no trae ventas. Verás solo las métricas de inventario.</p>
      )}

      <section className={layout.card} aria-labelledby="categorias">
        <h2 id="categorias" className={layout.cardTitle}>
          Categorías detectadas
        </h2>
        <ul className={styles.chips}>
          {categorias.map(({ categoria, productos }) => (
            <li key={categoria.id} className={styles.chip}>
              <span aria-hidden>{categoria.emoji}</span> {categoria.nombre} · {productos}
            </li>
          ))}
        </ul>
      </section>

      {data.errores.length > 0 && (
        <section className={styles.errors} aria-labelledby="errores">
          <h2 id="errores" className={styles.errorsTitle}>
            <TriangleAlert size={18} aria-hidden />
            {data.errores.length === 1 ? '1 fila con errores se omitió' : `${data.errores.length} filas con errores se omitieron`}
          </h2>
          <ul className={styles.errorList}>
            {data.errores.slice(0, ERRORES_VISIBLES).map((e) => (
              <li key={e.fila}>
                <strong>Fila {e.fila}:</strong> {e.motivo}
              </li>
            ))}
          </ul>
          {data.errores.length > ERRORES_VISIBLES && (
            <p className={styles.more}>y {data.errores.length - ERRORES_VISIBLES} más.</p>
          )}
        </section>
      )}

      <div className={`${layout.stickyActions} ${layout.stickyActionsNoNav}`}>
        <Button asChild className={layout.bigButton}>
          <Link href="/inicio">Ver mi tablero</Link>
        </Button>
      </div>
    </main>
  );
}

export default function RevisionPage() {
  return (
    <RequireData>
      <Review />
    </RequireData>
  );
}
