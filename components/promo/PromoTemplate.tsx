'use client';

import { useEffect, useRef, useState, type Ref } from 'react';
import type { PromoContent, PromoFormato } from '@/lib/ai/schemas';
import type { Palette } from '@/lib/promo/palette';
import type { PriceLine } from '@/lib/promo/pricing';
import styles from './PromoTemplate.module.css';

export const TAMANOS: Readonly<Record<PromoFormato, { readonly width: number; readonly height: number }>> = {
  '1:1': { width: 1080, height: 1080 },
  '9:16': { width: 1080, height: 1920 },
};

type Props = {
  readonly contenido: PromoContent;
  readonly paleta: Palette;
  readonly formato: PromoFormato;
  readonly producto: string;
  readonly emoji: string;
  readonly foto: string | null;
  readonly precio: PriceLine;
  readonly tienda: string;
  readonly qr: string | null;
  readonly ref?: Ref<HTMLDivElement>;
};

// The big headline shrinks with its length so it never overflows.
const titleSize = (titulo: string): string => (titulo.length <= 5 ? 'xl' : titulo.length <= 10 ? 'lg' : 'md');

export function PromoTemplate({ contenido, paleta, formato, producto, emoji, foto, precio, tienda, qr, ref }: Props) {
  const marco = useRef<HTMLDivElement>(null);
  const [escala, setEscala] = useState(0);
  const { width, height } = TAMANOS[formato];

  useEffect(() => {
    const nodo = marco.current;
    if (!nodo) return;
    const observer = new ResizeObserver(([entrada]) => setEscala(entrada.contentRect.width / width));
    observer.observe(nodo);
    return () => observer.disconnect();
  }, [width]);

  return (
    <div ref={marco} className={styles.frame} style={{ height: height * escala }}>
      <div
        ref={ref}
        className={styles.template}
        data-formato={formato}
        style={{ width, height, transform: `scale(${escala})`, background: paleta.fondo, color: paleta.texto }}
        role="img"
        aria-label={`Promoción: ${contenido.titulo} ${contenido.subtitulo}. ${producto}, ${precio.ahora}.`}
      >
        <div className={styles.top}>
          <span className={styles.brand} style={{ color: paleta.acento }}>
            {tienda}
          </span>
          {contenido.etiqueta && (
            <span className={styles.tag} style={{ background: paleta.acento, color: paleta.fondo }}>
              {contenido.etiqueta}
            </span>
          )}
        </div>

        <div className={styles.middle}>
          <div className={styles.circle} style={{ background: paleta.acento }}>
            {foto ? (
              // eslint-disable-next-line @next/next/no-img-element -- local object URL, exported to PNG
              <img src={foto} alt="" className={styles.photo} />
            ) : (
              <span className={styles.emoji}>{emoji}</span>
            )}
          </div>
          <div className={styles.headline}>
            <p className={styles.title} data-size={titleSize(contenido.titulo)}>
              {contenido.titulo}
            </p>
            <p className={styles.subtitle} style={{ color: paleta.acento }}>
              {contenido.subtitulo}
            </p>
          </div>
        </div>

        <div className={styles.bottom}>
          <div className={styles.productBlock}>
            <p className={styles.product}>{producto}</p>
            <p className={styles.price}>
              {precio.antes && (
                <>
                  <s className={styles.before}>{precio.antes}</s>
                  {' · '}
                </>
              )}
              <strong>{precio.ahora}</strong>
              {precio.nota && ` · ${precio.nota}`}
            </p>
          </div>
          {qr && (
            <div className={styles.qr}>
              {/* eslint-disable-next-line @next/next/no-img-element -- data URL, exported to PNG */}
              <img src={qr} alt="" width={180} height={180} />
              <span>Compra aquí</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
