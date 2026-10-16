'use client';

import { ArrowRight, RotateCw } from 'lucide-react';
import Link from 'next/link';
import layout from '@/components/layout/Page.module.css';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useWhatIf, type WhatIfCard } from '@/hooks/useWhatIf';
import { formatMoney, formatNumber, formatPercent } from '@/lib/format/money';
import { AskAiButton } from './AskAiButton';
import styles from './WhatIfCards.module.css';

const VEREDICTO: Readonly<Record<WhatIfCard['veredicto'], string>> = {
  conviene: 'Conviene',
  no_conviene: 'No conviene',
  depende: 'Depende',
};

const days = (n: number | null): string => {
  if (n === null) return 'sin ventas';
  if (n > 365) return 'más de un año';
  return `${formatNumber(Math.round(n))} días`;
};

function Metric({ label, antes, despues, delta }: { readonly label: string; readonly antes: string; readonly despues: string; readonly delta?: number | null }) {
  return (
    <div className={styles.metric}>
      <span className={styles.metricLabel}>{label}</span>
      <span className={styles.metricValue}>
        {antes} <ArrowRight size={14} aria-label="pasaría a" /> <strong>{despues}</strong>
        {delta !== undefined && delta !== null && Math.abs(delta) >= 0.005 && (
          <span className={styles.delta} data-trend={delta > 0 ? 'up' : 'down'}>
            {' '}
            {delta > 0 ? '▲' : '▼'} {formatPercent(delta)}
          </span>
        )}
      </span>
    </div>
  );
}

function Card({ tarjeta }: { readonly tarjeta: WhatIfCard }) {
  const { antes, despues } = tarjeta.candidato.proyeccion;
  const conGanancia = antes.ganancia !== null && despues.ganancia !== null;
  const base = conGanancia ? antes.ganancia ?? 0 : antes.ingresos;
  const nuevo = conGanancia ? despues.ganancia ?? 0 : despues.ingresos;
  return (
    <li className={styles.card}>
      <div className={styles.cardTop}>
        <span className={styles.verdict} data-veredicto={tarjeta.veredicto}>
          {VEREDICTO[tarjeta.veredicto]}
        </span>
      </div>
      <h3 className={styles.question}>{tarjeta.titulo}</h3>
      <div className={styles.metrics}>
        <Metric
          label={conGanancia ? 'Ganancia 30 días' : 'Ingresos 30 días'}
          antes={formatMoney(base)}
          despues={formatMoney(nuevo)}
          delta={base === 0 ? null : (nuevo - base) / Math.abs(base)}
        />
        <Metric label="Se agota en" antes={days(antes.diasParaAgotarse)} despues={days(despues.diasParaAgotarse)} />
        {(antes.ventasPerdidas > 0 || despues.ventasPerdidas > 0) && (
          <Metric label="Ventas perdidas por falta de stock" antes={`${formatNumber(antes.ventasPerdidas)} pzas`} despues={`${formatNumber(despues.ventasPerdidas)} pzas`} />
        )}
      </div>
      <p className={styles.explanation}>{tarjeta.explicacion}</p>
      <div className={styles.actions}>
        <AskAiButton pregunta={`${tarjeta.titulo} Explícame la simulación y qué me recomiendas.`} label="Pregúntale más" />
        <Link href={`/inventario/${encodeURIComponent(tarjeta.candidato.sku)}`} className={styles.link}>
          Ver producto
        </Link>
      </div>
    </li>
  );
}

export function WhatIfCards() {
  const { tarjetas, cargando, error, reintentar, hayCandidatos } = useWhatIf();
  if (!hayCandidatos) return null;

  return (
    <section className={layout.card} aria-labelledby="y-si" aria-busy={cargando}>
      <div className={styles.header}>
        <h2 id="y-si" className={styles.title}>
          ¿Y si…?
        </h2>
        <p className={styles.subtitle}>Escenarios simulados con tus ventas, a 30 días. La IA eligió los más útiles.</p>
      </div>

      {cargando && (
        <div className={styles.skeletons} aria-label="Simulando escenarios">
          <Skeleton className={styles.skeleton} />
          <Skeleton className={styles.skeleton} />
        </div>
      )}

      {!cargando && error && (
        <div className={styles.error} role="alert">
          <p>{error}.</p>
          <Button variant="outline" className={styles.retry} onClick={() => void reintentar()}>
            <RotateCw aria-hidden /> Reintentar
          </Button>
        </div>
      )}

      {!cargando && !error && tarjetas.length > 0 && (
        <>
          <ul className={styles.list}>
            {tarjetas.map((t) => (
              <Card key={t.id} tarjeta={t} />
            ))}
          </ul>
          <p className={styles.note}>Proyecciones estimadas: cambios de precio según cómo respondieron tus ventas con descuento. Pregunta al chat por otros escenarios.</p>
        </>
      )}
    </section>
  );
}
