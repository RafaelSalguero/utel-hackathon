'use client';

import { ArrowUp, RotateCw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useDataChat } from '@/hooks/useDataChat';
import { parseRichText } from '@/lib/format/richText';
import styles from './DataChat.module.css';

const SUGERENCIAS = [
  '¿Cuál es mi producto más vendido?',
  '¿Qué producto tiene mejor ROI?',
  '¿Qué productos están en riesgo?',
  '¿A qué categorías debo poner atención?',
] as const;

const PLACEHOLDER = 'Pregunta sobre tus datos, ej. ¿qué producto me deja más ganancia?';

function RichText({ texto }: { readonly texto: string }) {
  const bloques = parseRichText(texto);
  return (
    <>
      {bloques.map((b, i) => {
        const contenido = b.segmentos.map((s, j) => (s.negrita ? <strong key={j}>{s.texto}</strong> : <span key={j}>{s.texto}</span>));
        return b.tipo === 'item' ? (
          <p key={i} className={styles.item}>
            {contenido}
          </p>
        ) : (
          <p key={i}>{contenido}</p>
        );
      })}
    </>
  );
}

export function DataChat() {
  const { mensajes, preguntar, reintentar, pensando, error } = useDataChat();
  const [borrador, setBorrador] = useState('');
  const final = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (mensajes.length > 0 || pensando) final.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [mensajes.length, pensando]);

  const enviar = (texto: string) => {
    if (texto.trim() === '' || pensando) return;
    preguntar(texto);
    setBorrador('');
  };

  return (
    <div className={styles.chat}>
      <h3 className={styles.title}>Pregúntale a tus datos</h3>

      {mensajes.length === 0 && (
        <ul className={styles.suggestions} aria-label="Preguntas de ejemplo">
          {SUGERENCIAS.map((s) => (
            <li key={s}>
              <button type="button" className={styles.suggestion} onClick={() => enviar(s)} disabled={pensando}>
                {s}
              </button>
            </li>
          ))}
        </ul>
      )}

      {mensajes.length > 0 && (
        <div className={styles.messages} role="log" aria-live="polite" aria-label="Conversación">
          {mensajes.map((m, i) => (
            <div key={i} className={m.rol === 'usuario' ? styles.user : styles.assistant}>
              <span className={styles.srOnly}>{m.rol === 'usuario' ? 'Tú:' : 'StockIA:'}</span>
              {m.rol === 'usuario' ? <p>{m.texto}</p> : <RichText texto={m.texto} />}
            </div>
          ))}
          {pensando && (
            <div className={`${styles.assistant} ${styles.thinking}`} aria-label="Consultando tus datos">
              <span className={styles.dot} />
              <span className={styles.dot} />
              <span className={styles.dot} />
            </div>
          )}
          {error && !pensando && (
            <div className={styles.error} role="alert">
              <p>{error}.</p>
              <Button variant="outline" className={styles.retry} onClick={reintentar}>
                <RotateCw aria-hidden /> Reintentar
              </Button>
            </div>
          )}
          <div ref={final} />
        </div>
      )}

      <form
        className={styles.form}
        onSubmit={(e) => {
          e.preventDefault();
          enviar(borrador);
        }}
      >
        <textarea
          value={borrador}
          onChange={(e) => setBorrador(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              enviar(borrador);
            }
          }}
          placeholder={PLACEHOLDER}
          aria-label="Pregunta sobre tus datos"
          maxLength={1000}
          rows={2}
          className={styles.input}
        />
        <Button type="submit" className={styles.send} disabled={pensando || borrador.trim() === ''} aria-label="Enviar pregunta">
          <ArrowUp aria-hidden />
        </Button>
      </form>
    </div>
  );
}
