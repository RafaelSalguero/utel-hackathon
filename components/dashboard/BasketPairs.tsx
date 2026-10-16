'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import layout from '@/components/layout/Page.module.css';
import { usePairs } from '@/hooks/useStore';
import { featuredPairs, type Oportunidad, type ProductPair } from '@/lib/domain/basket';
import { formatNumber } from '@/lib/format/money';
import { AskAiButton } from './AskAiButton';
import styles from './BasketPairs.module.css';

const ETIQUETA: Readonly<Record<Oportunidad, string>> = {
  liquidar_en_kit: 'Liquida en kit',
  riesgo_doble: 'Riesgo doble',
  kit: 'Haz un kit',
};

// The idea behind each pair, from the products' stock status.
const insight = (p: ProductPair): string => {
  if (p.oportunidad === 'liquidar_en_kit') {
    const [lento, popular] = p.a.estado === 'lento' ? [p.a, p.b] : [p.b, p.a];
    return `${lento.producto} tiene stock que no se mueve, pero suele ir con ${popular.producto}. Un kit puede moverlo.`;
  }
  if (p.oportunidad === 'riesgo_doble') {
    const [critico, otro] = p.a.estado === 'por_agotarse' ? [p.a, p.b] : [p.b, p.a];
    return `${critico.producto} está por agotarse: si se acaba, también puedes perder ventas de ${otro.producto}.`;
  }
  return `El ${Math.round(p.confianzaAB * 100)}% de los pedidos con ${p.a.producto} también llevan ${p.b.producto}.`;
};

// The promo goes to the product that needs the push: the slow one, else the less popular one.
const promoSku = (p: ProductPair): string => (p.b.estado === 'lento' || (p.a.estado !== 'lento' && p.confianzaBA < p.confianzaAB) ? p.b.sku : p.a.sku);

export function BasketPairs() {
  const pares = usePairs();
  const destacados = useMemo(() => featuredPairs(pares), [pares]);

  return (
    <section className={layout.card} aria-labelledby="se-compra-junto">
      <div className={styles.header}>
        <h2 id="se-compra-junto" className={styles.title}>
          Lo que se compra junto
        </h2>
        <p className={styles.subtitle}>Productos que tus clientes llevan en el mismo pedido más de lo normal.</p>
      </div>

      {destacados.length === 0 ? (
        <p className={styles.empty}>Todavía no hay suficientes pedidos con varios productos para encontrar patrones.</p>
      ) : (
        <ul className={styles.list}>
          {destacados.map((p) => (
            <li key={`${p.a.sku}|${p.b.sku}`} className={styles.pair}>
              <div className={styles.products}>
                <span className={styles.emoji} aria-hidden>
                  {p.a.emoji}
                </span>
                <span className={styles.plus} aria-hidden>
                  +
                </span>
                <span className={styles.emoji} aria-hidden>
                  {p.b.emoji}
                </span>
                <span className={styles.tag} data-oportunidad={p.oportunidad}>
                  {ETIQUETA[p.oportunidad]}
                </span>
              </div>
              <p className={styles.names}>
                {p.a.producto} <span className={styles.amp}>+</span> {p.b.producto}
              </p>
              <p className={styles.stats}>
                {formatNumber(p.pedidos)} pedidos juntos · {p.lift}× más que al azar
              </p>
              <p className={styles.insight}>{insight(p)}</p>
              <div className={styles.actions}>
                <AskAiButton pregunta={`¿Cómo aprovecho que ${p.a.producto} y ${p.b.producto} se compran juntos?`} />
                <Link href={`/promos?sku=${encodeURIComponent(promoSku(p))}`} className={styles.link}>
                  Crear promo
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
