'use client';

import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import layout from '@/components/layout/Page.module.css';
import type { DailyPoint } from '@/lib/domain/metrics';
import { formatShortDate } from '@/lib/format/dates';
import { formatMoney } from '@/lib/format/money';
import styles from './SalesChart.module.css';

export function SalesChart({ serie }: { readonly serie: readonly DailyPoint[] }) {
  const mitad = Math.floor(serie.length / 2);
  const ticks = [serie[0]?.fecha, serie[mitad]?.fecha, serie[serie.length - 1]?.fecha].filter(Boolean);
  const total = serie.reduce((s, p) => s + p.total, 0);

  return (
    <section className={layout.card} aria-labelledby="ventas-dia">
      <div className={layout.cardHeader}>
        <h2 id="ventas-dia" className={layout.cardTitle}>
          Ventas por día
        </h2>
        <span className={layout.cardMeta}>últimos {serie.length} días · MXN</span>
      </div>
      <div className={styles.chart} role="img" aria-label={`Ventas de los últimos ${serie.length} días: ${formatMoney(total)} en total. Las barras oscuras son la última semana.`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={[...serie]} margin={{ top: 4, right: 14, bottom: 0, left: 14 }} barCategoryGap="18%">
            <XAxis
              dataKey="fecha"
              ticks={ticks}
              interval={0}
              tickFormatter={formatShortDate}
              tickLine={false}
              axisLine={{ stroke: 'var(--border)' }}
              tick={{ fill: 'var(--text-subtle)', fontSize: 12 }}
              tickMargin={8}
            />
            <Tooltip
              cursor={{ fill: 'var(--accent)' }}
              formatter={(v) => [formatMoney(Number(v)), 'Ventas']}
              labelFormatter={(l) => formatShortDate(String(l))}
              contentStyle={{ borderRadius: 8, border: '1px solid var(--border)', background: 'var(--popover)', color: 'var(--popover-foreground)' }}
            />
            <Bar dataKey="total" radius={[4, 4, 0, 0]} isAnimationActive={false}>
              {serie.map((p, i) => (
                <Cell key={p.fecha} fill={i >= serie.length - 7 ? 'var(--primary)' : 'var(--chart-3)'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
