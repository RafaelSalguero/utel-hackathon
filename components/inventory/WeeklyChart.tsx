'use client';

import { sumBy } from 'lodash-es';
import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, XAxis } from 'recharts';
import layout from '@/components/layout/Page.module.css';
import { formatNumber } from '@/lib/format/money';
import styles from './WeeklyChart.module.css';

const RECIENTES = 3;

export function WeeklyChart({ semanas }: { readonly semanas: readonly number[] }) {
  const datos = semanas.map((unidades, i) => ({ semana: i, unidades }));
  const promedio = sumBy(semanas.slice(-RECIENTES)) / RECIENTES;

  return (
    <section className={layout.card} aria-labelledby="por-semana">
      <div className={layout.cardHeader}>
        <h2 id="por-semana" className={layout.cardTitle}>
          Unidades vendidas por semana
        </h2>
        <span className={layout.cardMeta}>{semanas.length} semanas</span>
      </div>
      <div className={styles.chart} role="img" aria-label={`Unidades por semana, de la más antigua a la más reciente: ${semanas.join(', ')}`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={datos} margin={{ top: 22, right: 0, bottom: 0, left: 0 }} barCategoryGap="14%">
            <XAxis dataKey="semana" hide />
            <Bar dataKey="unidades" radius={[4, 4, 0, 0]} isAnimationActive={false} minPointSize={2}>
              <LabelList dataKey="unidades" position="top" fill="var(--foreground)" fontSize={12} fontWeight={700} />
              {datos.map((d) => (
                <Cell key={d.semana} fill={d.semana >= semanas.length - RECIENTES ? 'var(--primary)' : 'var(--chart-3)'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className={styles.foot}>Promedio reciente: {formatNumber(promedio)} unidades por semana</p>
    </section>
  );
}
