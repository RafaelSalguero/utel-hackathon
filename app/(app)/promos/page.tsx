'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import layout from '@/components/layout/Page.module.css';
import { PromoForm } from '@/components/promo/PromoForm';

function FormWithParams() {
  const params = useSearchParams();
  const sku = params.get('sku');
  // key: a new ?sku= resets the form to that product
  return <PromoForm key={sku ?? ''} skuInicial={sku} />;
}

export default function PromosPage() {
  return (
    <main className={`${layout.page} ${layout.withNav}`}>
      <div>
        <h1 className={layout.title}>Crear promoción</h1>
        <p className={layout.subtitle}>Imagen y texto listos para tus redes</p>
      </div>
      <Suspense>
        <FormWithParams />
      </Suspense>
    </main>
  );
}
