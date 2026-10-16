'use client';

import { RotateCw, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAiSummary } from '@/hooks/useAiSummary';
import styles from './AiSummary.module.css';

export function AiSummary() {
  const { resumen, cargando, error, reintentar, hayVentas } = useAiSummary();

  return (
    <section className={styles.card} aria-labelledby="resumen-ia" aria-busy={cargando}>
      <h2 id="resumen-ia" className={styles.title}>
        <Sparkles size={18} aria-hidden /> Resumen IA
      </h2>

      {!hayVentas && <p className={styles.text}>Sube un archivo con ventas para recibir recomendaciones.</p>}

      {cargando && (
        <div className={styles.skeletons} aria-label="Generando resumen">
          <Skeleton className={styles.skeleton} />
          <Skeleton className={styles.skeleton} />
          <Skeleton className={styles.skeletonShort} />
        </div>
      )}

      {!cargando && error && (
        <div className={styles.error} role="alert">
          <p>{error}. Tu tablero sigue funcionando.</p>
          <Button variant="outline" className={styles.retry} onClick={() => void reintentar()}>
            <RotateCw aria-hidden /> Reintentar
          </Button>
        </div>
      )}

      {!cargando && !error && resumen && (
        <>
          {resumen.datosInsuficientes && (
            <p className={styles.text}>Todavía hay pocas ventas para recomendaciones precisas.</p>
          )}
          <ul className={styles.list}>
            {resumen.recomendaciones.map((r) => (
              <li key={`${r.titulo}-${r.accion}`} className={styles.text}>
                {r.sku ? (
                  <Link href={`/inventario/${encodeURIComponent(r.sku)}`} className={styles.link}>
                    {r.titulo}
                  </Link>
                ) : (
                  <strong>{r.titulo}</strong>
                )}{' '}
                {r.texto}
              </li>
            ))}
          </ul>
          <p className={styles.disclaimer}>Generado con IA a partir de tus datos. Revísalo antes de decidir.</p>
        </>
      )}
    </section>
  );
}
