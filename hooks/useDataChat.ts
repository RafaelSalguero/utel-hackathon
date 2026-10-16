'use client';

import { useMemo, useState } from 'react';
import type { ChatMessage } from '@/lib/ai/schemas';
import { selectChatDataset } from '@/state/selectors';
import { useGroups, useKpis, useLoadedStore } from './useStore';

const MAX_HISTORIAL = 20; // the API accepts up to 20 messages per request

// History lives in the store, so it survives navigating between tabs (not a reload).
export const useDataChat = () => {
  const { state, dispatch } = useLoadedStore();
  const grupos = useGroups();
  const kpis = useKpis();
  const dataset = useMemo(() => selectChatDataset(state.data, grupos, kpis), [state.data, grupos, kpis]);
  const [pensando, setPensando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pedirRespuesta = async (historial: readonly ChatMessage[]) => {
    setPensando(true);
    setError(null);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataset, mensajes: historial.slice(-MAX_HISTORIAL) }),
      });
      const json = (await res.json().catch(() => null)) as { respuesta?: string; error?: string } | null;
      if (!res.ok || typeof json?.respuesta !== 'string') {
        setError(json?.error ?? 'No se pudo obtener una respuesta');
        return;
      }
      dispatch({ type: 'chat', mensaje: { rol: 'asistente', texto: json.respuesta } });
    } catch {
      setError('No se pudo contactar a la IA');
    } finally {
      setPensando(false);
    }
  };

  const preguntar = (texto: string) => {
    const pregunta = texto.trim();
    if (pregunta === '' || pensando) return;
    const mensaje: ChatMessage = { rol: 'usuario', texto: pregunta.slice(0, 1000) };
    dispatch({ type: 'chat', mensaje });
    void pedirRespuesta([...state.chat, mensaje]);
  };

  // After an error the last message is the unanswered question: ask again.
  const reintentar = () => {
    if (!pensando && state.chat.length > 0) void pedirRespuesta(state.chat);
  };

  return { mensajes: state.chat, preguntar, reintentar, pensando, error };
};
