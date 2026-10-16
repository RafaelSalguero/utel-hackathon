'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { PromoSchema, type PromoContent, type PromoInput } from '@/lib/ai/schemas';

type PromoState =
  | { readonly status: 'cargando' }
  | { readonly status: 'listo'; readonly contenido: PromoContent }
  | { readonly status: 'error'; readonly error: string };

export const usePromo = (input: PromoInput | null) => {
  const [estado, setEstado] = useState<PromoState>({ status: 'cargando' });
  const pedido = useRef(false);

  const generar = useCallback(async () => {
    if (input === null) return;
    setEstado({ status: 'cargando' });
    try {
      const res = await fetch('/api/promo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      const json: unknown = await res.json().catch(() => null);
      const parsed = PromoSchema.safeParse(json);
      if (!res.ok || !parsed.success) {
        setEstado({ status: 'error', error: (json as { error?: string } | null)?.error ?? 'No se pudo generar la promoción' });
        return;
      }
      setEstado({ status: 'listo', contenido: parsed.data });
    } catch {
      setEstado({ status: 'error', error: 'No se pudo contactar a la IA' });
    }
  }, [input]);

  useEffect(() => {
    if (input === null || pedido.current) return;
    pedido.current = true;
    void generar();
  }, [input, generar]);

  return { estado, regenerar: generar };
};
