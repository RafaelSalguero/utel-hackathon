'use client';

import { RotateCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import layout from '@/components/layout/Page.module.css';
import { TopBar } from '@/components/layout/TopBar';
import { CopyBlock, fullPostText } from '@/components/promo/CopyBlock';
import { PromoTemplate, TAMANOS } from '@/components/promo/PromoTemplate';
import { StylePicker } from '@/components/promo/StylePicker';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { usePromo } from '@/hooks/usePromo';
import { useGroups, useLoadedStore } from '@/hooks/useStore';
import type { PromoInput } from '@/lib/ai/schemas';
import { paletteOptions } from '@/lib/promo/palette';
import { priceLine } from '@/lib/promo/pricing';
import { normalizeUrl, toQrDataUrl } from '@/lib/promo/qr';
import { downloadBlob, fileSlug, sharePng } from '@/lib/promo/share';
import { nodeToPng } from '@/lib/promo/toPng';
import { selectProduct } from '@/state/selectors';
import styles from './page.module.css';

export default function PromoResultPage() {
  const router = useRouter();
  const { state } = useLoadedStore();
  const grupos = useGroups();
  const solicitud = state.promo;
  const grupo = useMemo(() => (solicitud ? selectProduct(grupos, solicitud.sku) : null), [grupos, solicitud]);

  const input = useMemo<PromoInput | null>(
    () =>
      solicitud && grupo
        ? {
            producto: grupo.producto.slice(0, 80),
            categoria: grupo.categoria.nombre,
            precio: grupo.precio,
            tipo: solicitud.tipo,
            descuento: solicitud.descuento,
            formato: solicitud.formato,
          }
        : null,
    [solicitud, grupo],
  );

  const { estado, regenerar } = usePromo(input);
  const [paletaId, setPaletaId] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [exportando, setExportando] = useState(false);
  const plantilla = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (solicitud === null || grupo === null) router.replace('/promos');
  }, [solicitud, grupo, router]);

  useEffect(() => {
    const url = solicitud ? normalizeUrl(solicitud.url) : null;
    if (url === null) return;
    void toQrDataUrl(url).then((r) => (r.ok ? setQr(r.value) : toast.error(r.error)));
  }, [solicitud]);

  if (solicitud === null || grupo === null || input === null) return null;

  const contenido = estado.status === 'listo' ? estado.contenido : null;
  const opciones = paletteOptions(contenido?.paleta ?? null);
  const paleta = opciones.find((p) => p.id === paletaId) ?? opciones[0];
  const precio = priceLine(solicitud.tipo, grupo.precio, solicitud.descuento);
  const { width, height } = TAMANOS[solicitud.formato];
  const nombreArchivo = `promo-${fileSlug(grupo.producto)}.png`;

  const exportar = async (accion: 'descargar' | 'compartir') => {
    if (!plantilla.current || !contenido) return;
    setExportando(true);
    const png = await nodeToPng(plantilla.current, width, height);
    setExportando(false);
    if (!png.ok) {
      toast.error(png.error, { action: { label: 'Reintentar', onClick: () => void exportar(accion) } });
      return;
    }
    if (accion === 'descargar') {
      downloadBlob(png.value, nombreArchivo);
      return;
    }
    const resultado = await sharePng(png.value, nombreArchivo, fullPostText(contenido.copy, contenido.hashtags));
    if (resultado === 'descargado') toast.info('Tu navegador no permite compartir: descargamos la imagen.');
  };

  return (
    <main className={`${layout.page} ${layout.withNav}`}>
      <TopBar href="/promos" label="Tu promoción" strong />

      {estado.status === 'cargando' && (
        <div aria-busy="true" aria-label="Generando promoción">
          <Skeleton className={styles.skeleton} style={{ aspectRatio: `${width} / ${height}` }} />
          <p className={styles.loadingText}>Generando imagen y texto…</p>
        </div>
      )}

      {estado.status === 'error' && (
        <div className={`${layout.card} ${styles.error}`} role="alert">
          <p>{estado.error}.</p>
          <Button variant="outline" className={styles.actionButton} onClick={() => void regenerar()}>
            <RotateCw aria-hidden /> Reintentar
          </Button>
        </div>
      )}

      {contenido && (
        <>
          <PromoTemplate
            ref={plantilla}
            contenido={contenido}
            paleta={paleta}
            formato={solicitud.formato}
            producto={grupo.producto}
            emoji={grupo.categoria.emoji}
            foto={solicitud.foto}
            precio={precio}
            tienda={solicitud.tienda}
            qr={qr}
          />

          <div className={styles.toolbar}>
            <StylePicker opciones={opciones} elegida={paleta.id} onElegir={setPaletaId} />
            <Button variant="outline" className={styles.actionButton} onClick={() => void regenerar()}>
              <RotateCw aria-hidden /> Regenerar
            </Button>
          </div>

          <CopyBlock copy={contenido.copy} hashtags={contenido.hashtags} />

          <p className={layout.notice}>Revisa precio, descuento y texto antes de publicar. La IA puede equivocarse.</p>

          <div className={`${layout.stickyActions} ${layout.pair}`}>
            <Button variant="outline" className={layout.bigButton} disabled={exportando} onClick={() => void exportar('descargar')}>
              Descargar PNG
            </Button>
            <Button className={layout.bigButton} disabled={exportando} onClick={() => void exportar('compartir')}>
              Compartir
            </Button>
          </div>
        </>
      )}
    </main>
  );
}
