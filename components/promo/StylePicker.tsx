import type { NamedPalette } from '@/lib/promo/palette';
import styles from './StylePicker.module.css';

type Props = {
  readonly opciones: readonly NamedPalette[];
  readonly elegida: string;
  readonly onElegir: (id: string) => void;
};

export function StylePicker({ opciones, elegida, onElegir }: Props) {
  return (
    <div className={styles.picker} role="radiogroup" aria-label="Estilo de color">
      {opciones.map((p) => (
        <button
          key={p.id}
          type="button"
          role="radio"
          aria-checked={elegida === p.id}
          aria-label={p.nombre}
          title={p.nombre}
          className={styles.swatch}
          style={{ background: p.fondo }}
          onClick={() => onElegir(p.id)}
        >
          <span className={styles.dot} style={{ background: p.acento }} aria-hidden />
        </button>
      ))}
    </div>
  );
}
