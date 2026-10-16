'use client';

import { Upload } from 'lucide-react';
import Link from 'next/link';
import { useMemo } from 'react';
import { AiSummary } from '@/components/dashboard/AiSummary';
import { AlertRow } from '@/components/dashboard/AlertRow';
import { KpiCard } from '@/components/dashboard/KpiCard';
import { SalesChart } from '@/components/dashboard/SalesChart';
import { TopProducts } from '@/components/dashboard/TopProducts';
import layout from '@/components/layout/Page.module.css';
import { useGroups, useKpis, useLoadedStore } from '@/hooks/useStore';
import { formatLongDate } from '@/lib/format/dates';
import { formatMoney, formatNumber } from '@/lib/format/money';
import { selectAlerts, selectDailySeries, selectTopProducts } from '@/state/selectors';
import styles from './page.module.css';

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

export default function DashboardPage() {
  const { state } = useLoadedStore();
  const grupos = useGroups();
  const kpis = useKpis();
  const alertas = useMemo(() => selectAlerts(grupos), [grupos]);
  const serie = useMemo(() => selectDailySeries(state.data), [state.data]);
  const top = useMemo(() => selectTopProducts(grupos), [grupos]);
  const { fechaCorte } = state.data;

  return (
    <main className={`${layout.page} ${layout.withNav}`}>
      <header className={styles.header}>
        <div className={styles.headerText}>
          <p className={styles.source}>
            Datos de {state.archivo.nombre}
            {fechaCorte && ` · ${formatLongDate(fechaCorte)}`}
          </p>
          <h1 className={layout.title}>Hola 👋</h1>
        </div>
        <Link href="/" className={styles.uploadButton} aria-label="Subir otro archivo">
          <Upload size={22} aria-hidden />
        </Link>
      </header>

      <div className={layout.pair}>
        {kpis.hayVentas && (
          <>
            <KpiCard inverse label="Ventas últimos 7 días" value={formatMoney(kpis.ventas7d)} cambio={kpis.cambio7d} comparacion="vs. semana anterior" />
            <KpiCard label="Ventas últimos 30 días" value={formatMoney(kpis.ventas30d)} cambio={kpis.cambio30d} comparacion="vs. mes anterior" />
          </>
        )}
        <KpiCard label="Unidades en stock" value={formatNumber(kpis.unidadesStock)} pie={plural(kpis.productos, 'producto', 'productos')} />
        <KpiCard label="Valor del inventario" value={formatMoney(kpis.valorInventario)} pie="a precio de venta" />
      </div>

      {(alertas.porAgotarse > 0 || alertas.lentos > 0) && (
        <div className={styles.alerts}>
          {alertas.porAgotarse > 0 && (
            <AlertRow status="por_agotarse" texto={`${plural(alertas.porAgotarse, 'producto', 'productos')} por agotarse`} />
          )}
          {alertas.lentos > 0 && (
            <AlertRow status="lento" texto={`${plural(alertas.lentos, 'producto', 'productos')} sin ventas en 30 días`} />
          )}
        </div>
      )}

      {kpis.hayVentas ? (
        <SalesChart serie={serie} />
      ) : (
        <p className={layout.notice}>Tu archivo no trae ventas: mostramos solo las métricas de inventario.</p>
      )}

      <AiSummary />

      {top.length > 0 && <TopProducts grupos={top} />}
    </main>
  );
}
