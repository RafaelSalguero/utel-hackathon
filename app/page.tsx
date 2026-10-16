'use client';

import { Layers, Lock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import layout from '@/components/layout/Page.module.css';
import { Button } from '@/components/ui/button';
import { FileDrop } from '@/components/upload/FileDrop';
import { useCsvUpload } from '@/hooks/useCsvUpload';
import styles from './page.module.css';

const PASOS = [
  'Descarga la plantilla con las columnas requeridas.',
  'Exporta productos y ventas desde tu panel de Tiendanube.',
  'Pega los datos en la plantilla y súbela aquí.',
] as const;

export default function UploadPage() {
  const router = useRouter();
  const { subir, usarEjemplo, cargando, error } = useCsvUpload();

  const alTerminar = (exito: boolean) => {
    if (exito) router.push('/revision');
  };

  return (
    <main className={layout.page}>
      <div className={styles.brand}>
        <span className={styles.logo} aria-hidden>
          <Layers size={20} />
        </span>
        <span className={styles.brandName}>StockIA</span>
      </div>

      <div className={styles.intro}>
        <h1 className={styles.hero}>Conoce tu inventario en segundos</h1>
        <p className={layout.subtitle}>Sube el CSV de tu tienda de Tiendanube. No necesitas cuenta ni conexión.</p>
      </div>

      <FileDrop disabled={cargando} onFile={(file) => subir(file).then(alTerminar)} />

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      <Button className={layout.bigButton} disabled={cargando} onClick={() => usarEjemplo().then(alTerminar)}>
        Probar con datos de ejemplo
      </Button>

      <section className={layout.card} aria-labelledby="como-obtener">
        <h2 id="como-obtener" className={styles.howTitle}>
          ¿Cómo obtengo mi archivo?
        </h2>
        <ol className={styles.steps}>
          {PASOS.map((paso, i) => (
            <li key={paso} className={styles.step}>
              <span className={styles.stepNumber} aria-hidden>
                {i + 1}
              </span>
              <span>{paso}</span>
            </li>
          ))}
        </ol>
        <a className={styles.templateLink} href="/plantilla-tienda.csv" download="plantilla-tienda.csv">
          Descargar plantilla tienda.csv
        </a>
      </section>

      <p className={styles.footer}>
        <Lock size={14} aria-hidden />
        Solo lectura: tus datos no se guardan ni modifican tu tienda
      </p>
    </main>
  );
}
