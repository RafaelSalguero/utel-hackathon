'use client';

import { toast } from 'sonner';
import layout from '@/components/layout/Page.module.css';
import { Button } from '@/components/ui/button';
import { copyText } from '@/lib/promo/share';
import styles from './CopyBlock.module.css';

export const fullPostText = (copy: string, hashtags: readonly string[]): string =>
  hashtags.length === 0 ? copy : `${copy}\n\n${hashtags.join(' ')}`;

export function CopyBlock({ copy, hashtags }: { readonly copy: string; readonly hashtags: readonly string[] }) {
  const copiar = async () => {
    const exito = await copyText(fullPostText(copy, hashtags));
    if (exito) toast.success('Texto copiado');
    else toast.error('No se pudo copiar. Selecciona el texto y cópialo a mano.');
  };

  return (
    <section className={layout.card} aria-labelledby="texto-publicacion">
      <div className={styles.header}>
        <h2 id="texto-publicacion" className={layout.cardTitle}>
          Texto para la publicación
        </h2>
        <Button variant="secondary" className={styles.copy} onClick={() => void copiar()}>
          Copiar
        </Button>
      </div>
      <p className={styles.copyText}>{copy}</p>
      {hashtags.length > 0 && <p className={styles.tags}>{hashtags.join(' ')}</p>}
    </section>
  );
}
