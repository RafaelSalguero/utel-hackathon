'use client';

import { Camera, RectangleVertical, Search, Sparkles, Square, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useRef, useState } from 'react';
import { ProductThumb } from '@/components/inventory/ProductThumb';
import layout from '@/components/layout/Page.module.css';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useGroups, useLoadedStore } from '@/hooks/useStore';
import type { PromoFormato, PromoTipo } from '@/lib/ai/schemas';
import type { ProductGroup } from '@/lib/domain/types';
import { formatMoney, formatNumber, formatPercent } from '@/lib/format/money';
import { DESCUENTOS } from '@/lib/promo/pricing';
import { selectBySearch, selectProduct, selectSuggestedPromo } from '@/state/selectors';
import styles from './PromoForm.module.css';

const TIPOS: readonly { readonly id: PromoTipo; readonly label: string }[] = [
  { id: 'descuento', label: 'Descuento %' },
  { id: '2x1', label: '2×1' },
  { id: 'novedad', label: 'Novedad' },
  { id: 'ultimas_piezas', label: 'Últimas piezas' },
];

const FORMATOS: readonly { readonly id: PromoFormato; readonly label: string; readonly Icon: typeof Square }[] = [
  { id: '1:1', label: 'Post 1:1', Icon: Square },
  { id: '9:16', label: 'Historia 9:16', Icon: RectangleVertical },
];

const reason = (g: ProductGroup, sugerido: boolean): string => {
  if (sugerido && g.tendencia !== null && g.tendencia > 0) return `sugerido por tendencia ▲${formatPercent(g.tendencia)}`;
  return `${formatNumber(g.stock)} en stock`;
};

export function PromoForm({ skuInicial }: { readonly skuInicial: string | null }) {
  const router = useRouter();
  const { state, dispatch } = useLoadedStore();
  const grupos = useGroups();
  const previo = state.promo;

  const sugerido = useMemo(() => selectSuggestedPromo(grupos), [grupos]);
  const inicial = (skuInicial && selectProduct(grupos, skuInicial)) || (previo && selectProduct(grupos, previo.sku)) || sugerido;

  const [grupo, setGrupo] = useState<ProductGroup | null>(inicial);
  const [eligiendo, setEligiendo] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [tipo, setTipo] = useState<PromoTipo>(previo?.tipo ?? 'descuento');
  const [descuento, setDescuento] = useState<number>(previo?.descuento ?? 20);
  const [formato, setFormato] = useState<PromoFormato>(previo?.formato ?? '1:1');
  const [foto, setFoto] = useState<string | null>(previo?.foto ?? null);
  const [tienda, setTienda] = useState(previo?.tienda ?? (state.archivo.nombre === 'ejemplo-tienda.csv' ? 'Casa Lupita' : ''));
  const fotoInput = useRef<HTMLInputElement>(null);

  const resultados = useMemo(() => selectBySearch(grupos, busqueda).slice(0, 30), [grupos, busqueda]);

  // The photo stays in the browser as an object URL; release it when replaced.
  const cambiarFoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !file.type.startsWith('image/')) return;
    if (foto && foto !== previo?.foto) URL.revokeObjectURL(foto);
    setFoto(URL.createObjectURL(file));
  };

  const quitarFoto = () => {
    if (foto && foto !== previo?.foto) URL.revokeObjectURL(foto);
    setFoto(null);
  };

  const generar = () => {
    if (!grupo) return;
    dispatch({
      type: 'promo',
      promo: { sku: grupo.id, tipo, descuento: tipo === 'descuento' ? descuento : null, formato, foto, tienda: tienda.trim() },
    });
    router.push('/promos/resultado');
  };

  if (grupo === null) {
    return <p className={layout.card}>No hay productos en tu archivo.</p>;
  }

  return (
    <form
      className={styles.form}
      onSubmit={(e) => {
        e.preventDefault();
        generar();
      }}
    >
      <fieldset className={styles.section}>
        <legend className={layout.sectionLabel}>1 · Producto</legend>
        <div className={styles.productCard}>
          <ProductThumb categoria={grupo.categoria} />
          <div className={styles.productInfo}>
            <p className={styles.productName}>{grupo.producto}</p>
            <p className={styles.productMeta}>
              {formatMoney(grupo.precio)} · {reason(grupo, grupo.id === sugerido?.id && !skuInicial)}
            </p>
          </div>
          <button type="button" className={styles.change} onClick={() => setEligiendo(!eligiendo)} aria-expanded={eligiendo}>
            {eligiendo ? 'Cerrar' : 'Cambiar'}
          </button>
        </div>

        {eligiendo && (
          <div className={styles.picker}>
            <div className={styles.search}>
              <Search size={18} aria-hidden className={styles.searchIcon} />
              <Input
                autoFocus
                type="search"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar producto o SKU"
                aria-label="Buscar producto o SKU"
                className={styles.searchInput}
              />
            </div>
            <ul className={styles.pickerList}>
              {resultados.map((g) => (
                <li key={g.id}>
                  <button
                    type="button"
                    className={styles.pickerItem}
                    aria-current={g.id === grupo.id}
                    onClick={() => {
                      setGrupo(g);
                      setEligiendo(false);
                      setBusqueda('');
                    }}
                  >
                    <ProductThumb categoria={g.categoria} />
                    <span className={styles.productInfo}>
                      <span className={styles.productName}>{g.producto}</span>
                      <span className={styles.productMeta}>
                        {formatMoney(g.precio)} · {formatNumber(g.stock)} en stock
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </fieldset>

      <fieldset className={styles.section}>
        <legend className={layout.sectionLabel}>2 · Tipo de promoción</legend>
        <div className={layout.pair}>
          {TIPOS.map((t) => (
            <button key={t.id} type="button" className={styles.option} aria-pressed={tipo === t.id} onClick={() => setTipo(t.id)}>
              {t.label}
            </button>
          ))}
        </div>
        {tipo === 'descuento' && (
          <div className={styles.discounts} role="radiogroup" aria-label="Porcentaje de descuento">
            {DESCUENTOS.map((d) => (
              <button
                key={d}
                type="button"
                role="radio"
                aria-checked={descuento === d}
                className={styles.discount}
                onClick={() => setDescuento(d)}
              >
                {d}%
              </button>
            ))}
          </div>
        )}
      </fieldset>

      <fieldset className={styles.section}>
        <legend className={layout.sectionLabel}>3 · Formato</legend>
        <div className={layout.pair}>
          {FORMATOS.map(({ id, label, Icon }) => (
            <button key={id} type="button" className={styles.format} aria-pressed={formato === id} onClick={() => setFormato(id)}>
              <Icon size={24} aria-hidden />
              {label}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className={styles.section}>
        <legend className={layout.sectionLabel}>
          4 · Foto del producto <span className={styles.optional}>(opcional)</span>
        </legend>
        <input ref={fotoInput} type="file" accept="image/*" className={layout.srOnly} onChange={cambiarFoto} tabIndex={-1} />
        {foto ? (
          <div className={styles.photoRow}>
            {/* eslint-disable-next-line @next/next/no-img-element -- local object URL preview */}
            <img src={foto} alt="Foto elegida" className={styles.photoPreview} />
            <Button type="button" variant="outline" className={styles.smallButton} onClick={() => fotoInput.current?.click()}>
              Cambiar foto
            </Button>
            <Button type="button" variant="ghost" className={styles.iconButton} onClick={quitarFoto} aria-label="Quitar foto">
              <X aria-hidden />
            </Button>
          </div>
        ) : (
          <button type="button" className={styles.photoDrop} onClick={() => fotoInput.current?.click()}>
            <Camera size={22} aria-hidden /> Tomar o subir foto
          </button>
        )}
        <p className={styles.hint}>Sin foto usamos el ícono de la categoría. La foto no se guarda.</p>
      </fieldset>

      <fieldset className={styles.section}>
        <legend className={layout.sectionLabel}>
          5 · Tu tienda <span className={styles.optional}>(opcional)</span>
        </legend>
        <label className={styles.field}>
          <span>Nombre</span>
          <Input value={tienda} onChange={(e) => setTienda(e.target.value)} maxLength={30} placeholder="Casa Lupita" className={styles.input} />
        </label>
        <p className={styles.hint}>La imagen incluye un código QR que lleva a la página del producto en tu tienda.</p>
      </fieldset>

      <div className={layout.stickyActions}>
        <Button type="submit" className={layout.bigButton}>
          <Sparkles aria-hidden /> Generar con IA
        </Button>
      </div>
    </form>
  );
}
