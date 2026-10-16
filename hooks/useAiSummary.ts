'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { AiSummarySchema } from '@/lib/ai/schemas';
import { selectSummaryInput } from '@/state/selectors';
import { useGroups, useKpis, useLoadedStore } from './useStore';

// The summary is cached in the store and only requested again when another file is loaded.
export const useAiSummary = () => {
  const { state, dispatch } = useLoadedStore();
  const grupos = useGroups();
  const kpis = useKpis();
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pedido = useRef(false);

  const pedir = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const res = await fetch('/api/resumen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(selectSummaryInput(state.data, grupos, kpis)),
      });
      const json: unknown = await res.json().catch(() => null);
      const parsed = AiSummarySchema.safeParse(json);
      if (!res.ok || !parsed.success) {
        const mensaje = (json as { error?: string } | null)?.error ?? 'No se pudo generar el resumen';
        setError(mensaje);
        toast.error(mensaje); // the summary card shows the retry button
        return;
      }
      dispatch({ type: 'resumen', resumen: parsed.data });
    } catch {
      setError('No se pudo contactar a la IA');
    } finally {
      setCargando(false);
    }
  }, [state.data, grupos, kpis, dispatch]);

  const necesitaResumen = kpis.hayVentas && state.resumen === null;

  useEffect(() => {
    if (!necesitaResumen || pedido.current) return;
    pedido.current = true;
    void pedir();
  }, [necesitaResumen, pedir]);

  return { resumen: state.resumen, cargando, error, reintentar: pedir, hayVentas: kpis.hayVentas };
};
