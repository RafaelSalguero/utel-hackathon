'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ChatEventSchema, type ChatMessage } from '@/lib/ai/schemas';
import { splitLines } from '@/lib/format/ndjson';
import { REVEAL_TICK_MS, nextReveal } from '@/lib/format/reveal';
import { selectChatDataset } from '@/state/selectors';
import { useGroups, useKpis, useLoadedStore } from './useStore';

const MAX_HISTORIAL = 20; // the API accepts up to 20 messages per request

// The answer being written: the text shown so far and the tool the agent is using.
export type EnCurso = { readonly texto: string; readonly herramienta: string | null };

type Resultado = { readonly ok: true; readonly texto: string } | { readonly ok: false; readonly error: string | null };

// Reads the NDJSON stream from /api/chat. `onTexto` / `onHerramienta` report progress.
const readAnswer = async (
  res: Response,
  onTexto: (fragmento: string) => void,
  onHerramienta: (nombre: string) => void,
): Promise<Resultado> => {
  if (!res.ok || !res.body) {
    const json = (await res.json().catch(() => null)) as { error?: string } | null;
    return { ok: false, error: json?.error ?? 'No se pudo obtener una respuesta' };
  }
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = '';
  let texto = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) return { ok: false, error: 'La respuesta se interrumpió' };
    const { lineas, resto } = splitLines(buffer + value);
    buffer = resto;
    for (const linea of lineas) {
      const evento = ChatEventSchema.safeParse(JSON.parse(linea));
      if (!evento.success) continue;
      const e = evento.data;
      if (e.t === 'texto') {
        texto += e.texto;
        onTexto(e.texto);
      } else if (e.t === 'herramienta') onHerramienta(e.nombre);
      else if (e.t === 'error') return { ok: false, error: e.error };
      else return { ok: true, texto };
    }
  }
};

// History lives in the store, so it survives navigating between tabs (not a reload).
// The answer in progress is local and only enters the history once fully shown.
export const useDataChat = () => {
  const { state, dispatch } = useLoadedStore();
  const grupos = useGroups();
  const kpis = useKpis();
  const dataset = useMemo(() => selectChatDataset(state.data, grupos, kpis), [state.data, grupos, kpis]);
  const [enCurso, setEnCurso] = useState<EnCurso | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortar = useRef<AbortController | null>(null);

  // Stop the stream and the reveal if the dashboard unmounts mid-answer.
  useEffect(() => () => abortar.current?.abort(), []);

  const pedirRespuesta = async (historial: readonly ChatMessage[]) => {
    const control = new AbortController();
    abortar.current = control;
    setEnCurso({ texto: '', herramienta: null });
    setError(null);

    // What arrived vs. what is shown; a timer closes the gap word by word.
    let recibido = '';
    let mostrado = 0;
    let herramienta: string | null = null;
    const timer = setInterval(() => {
      mostrado = nextReveal(recibido, mostrado);
      setEnCurso({ texto: recibido.slice(0, mostrado), herramienta: mostrado < recibido.length ? null : herramienta });
    }, REVEAL_TICK_MS);
    const caughtUp = () =>
      new Promise<void>((resolve) => {
        const check = setInterval(() => {
          if (mostrado >= recibido.length || control.signal.aborted) {
            clearInterval(check);
            resolve();
          }
        }, REVEAL_TICK_MS);
      });

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataset, mensajes: historial.slice(-MAX_HISTORIAL) }),
        signal: control.signal,
      });
      const resultado = await readAnswer(
        res,
        (fragmento) => {
          recibido += fragmento;
          herramienta = null;
        },
        (nombre) => {
          herramienta = nombre;
        },
      );
      if (!resultado.ok) {
        setError(resultado.error);
        return;
      }
      await caughtUp();
      if (!control.signal.aborted) dispatch({ type: 'chat', mensaje: { rol: 'asistente', texto: resultado.texto } });
    } catch {
      if (!control.signal.aborted) setError('No se pudo contactar a la IA');
    } finally {
      clearInterval(timer);
      setEnCurso(null);
    }
  };

  const pensando = enCurso !== null;

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

  return { mensajes: state.chat, enCurso, preguntar, reintentar, pensando, error };
};
