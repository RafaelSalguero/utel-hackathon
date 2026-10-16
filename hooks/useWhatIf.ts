'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { WhatIfAiSchema, type WhatIfAi } from '@/lib/ai/schemas';
import { whatIfCandidates, type WhatIfCandidate } from '@/lib/domain/whatif';
import { useChatDataset, useLoadedStore } from './useStore';

export type WhatIfCard = WhatIfAi['escenarios'][number] & { readonly candidato: WhatIfCandidate };

// Candidates and their numbers come from code; the AI picks 5 and writes them.
// Cached in the store like the summary: requested again only for a new file.
export const useWhatIf = () => {
  const { state, dispatch } = useLoadedStore();
  const dataset = useChatDataset();
  const candidatos = useMemo(() => whatIfCandidates(dataset), [dataset]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pedido = useRef(false);

  const pedir = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const res = await fetch('/api/whatif', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fechaCorte: dataset.fechaCorte, candidatos }),
      });
      const json: unknown = await res.json().catch(() => null);
      const parsed = WhatIfAiSchema.safeParse(json);
      if (!res.ok || !parsed.success) {
        setError((json as { error?: string } | null)?.error ?? 'No se pudieron generar los escenarios');
        return;
      }
      dispatch({ type: 'whatif', whatIf: parsed.data });
    } catch {
      setError('No se pudo contactar a la IA');
    } finally {
      setCargando(false);
    }
  }, [dataset.fechaCorte, candidatos, dispatch]);

  const necesita = candidatos.length > 0 && state.whatIf === null;

  useEffect(() => {
    if (!necesita || pedido.current) return;
    pedido.current = true;
    void pedir();
  }, [necesita, pedir]);

  const tarjetas = useMemo<readonly WhatIfCard[]>(() => {
    const porId = Object.fromEntries(candidatos.map((c) => [c.id, c]));
    return (state.whatIf?.escenarios ?? []).flatMap((e) => (porId[e.id] ? [{ ...e, candidato: porId[e.id] }] : []));
  }, [state.whatIf, candidatos]);

  return { tarjetas, cargando, error, reintentar: pedir, hayCandidatos: candidatos.length > 0 };
};
