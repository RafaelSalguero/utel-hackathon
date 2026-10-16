'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMemo } from 'react';
import { ProductThumb } from '@/components/inventory/ProductThumb';
import { StockoutBlock } from '@/components/inventory/StockoutBlock';
import { VariantBars } from '@/components/inventory/VariantBars';
import { WeeklyChart } from '@/components/inventory/WeeklyChart';
import layout from '@/components/layout/Page.module.css';
import { TopBar } from '@/components/layout/TopBar';
import { Button } from '@/components/ui/button';
import { useGroups } from '@/hooks/useStore';
import { formatMoney } from '@/lib/format/money';
import { selectProduct } from '@/state/selectors';
import styles from './page.module.css';

export default function ProductDetailPage() {
  const params = useParams<{ sku: string }>();
  const sku = decodeURIComponent(params.sku);
  const grupos = useGroups();
  const grupo = useMemo(() => selectProduct(grupos, sku), [grupos, sku]);

  if (grupo === null) {
    return (
      <main className={`${layout.page} ${layout.withNav}`}>
        <TopBar href="/inventario" label="Inventario" />
        <div className={layout.card}>
          <p>No encontramos el SKU “{sku}” en tu archivo.</p>
        </div>
      </main>
    );
  }

  const skuMostrado = grupo.variantes.length > 1 ? `${grupo.variantes.length} variantes` : `SKU ${grupo.id}`;

  return (
    <main className={`${layout.page} ${layout.withNav}`}>
      <TopBar href="/inventario" label="Inventario" />

      <header className={styles.header}>
        <ProductThumb categoria={grupo.categoria} size="lg" />
        <div className={styles.headerText}>
          <h1 className={styles.name}>{grupo.producto}</h1>
          <p className={styles.meta}>
            {grupo.categoria.nombre} · {skuMostrado} · {formatMoney(grupo.precio)}
          </p>
        </div>
      </header>

      <StockoutBlock grupo={grupo} />

      {grupo.variantes.length > 1 && <VariantBars variantes={grupo.variantes} />}

      <WeeklyChart semanas={grupo.ventasPorSemana} />

      <div className={layout.stickyActions}>
        <Button asChild className={layout.bigButton}>
          <Link href={`/promos?sku=${encodeURIComponent(grupo.id)}`}>Crear promo</Link>
        </Button>
      </div>
    </main>
  );
}
