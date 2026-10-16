'use client';

import { ArrowUp, RotateCw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { CHAT_ID, useChat } from './DataChatProvider';
import { closeOpenBold, parseRichText } from '@/lib/format/richText';
import styles from './DataChat.module.css';

const SUGERENCIAS = [
  '¿Cuál es mi producto más vendido?',
  '¿Qué producto tiene mejor ROI?',
  '¿Qué productos están en riesgo?',
  '¿A qué categorías debo poner atención?',
  '¿Qué pasa si bajo 15% la Bolsa tote?',
  '¿Qué se compra junto con el Labial mate rojo?',
  '¿Estoy listo para el Buen Fin?',
] as const;

const PLACEHOLDER = 'Pregunta sobre tus datos, ej. ¿y si subo 10% la Sudadera?';

// What the agent is doing while it calls each tool.
const HERRAMIENTAS: Readonly<Record<string, string>> = {
  resumen_tienda: 'Revisando el resumen de tu tienda',
  ranking_productos: 'Comparando productos',
  detalle_producto: 'Buscando el producto',
  productos_en_riesgo: 'Revisando productos en riesgo',
  estadisticas_categorias: 'Analizando categorías',
  simular_escenario: 'Simulando el escenario',
  compras_juntas: 'Buscando lo que se compra junto',
  fechas_clave: 'Revisando las próximas fechas',
};

function Thinking({ herramienta }: { readonly herramienta: string | null }) {
  return (
    <span className={styles.thinking}>
      <span className={styles.dot} />
      <span className={styles.dot} />
      <span className={styles.dot} />
      <span className={styles.status}>{herramienta ? `${HERRAMIENTAS[herramienta] ?? 'Consultando tus datos'}…` : 'Pensando…'}</span>
    </span>
  );
}

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
  const { mensajes, enCurso, preguntar, reintentar, pensando, error } = useChat();
  const [borrador, setBorrador] = useState('');
  const lista = useRef<HTMLDivElement>(null);
  const largo = enCurso?.texto.length ?? 0;

  // Follow the answer as it grows, inside the conversation box only (not the whole page).
  useEffect(() => {
    const el = lista.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [mensajes.length, largo, pensando]);

  const enviar = (texto: string) => {
    if (texto.trim() === '' || pensando) return;
    preguntar(texto);
    setBorrador('');
  };

  return (
    <div className={styles.chat} id={CHAT_ID}>
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
        <div ref={lista} className={styles.messages} role="log" aria-label="Conversación">
          {mensajes.map((m, i) => (
            <div key={i} className={m.rol === 'usuario' ? styles.user : styles.assistant}>
              <span className={styles.srOnly}>{m.rol === 'usuario' ? 'Tú:' : 'StockIA:'}</span>
              {m.rol === 'usuario' ? <p>{m.texto}</p> : <RichText texto={m.texto} />}
            </div>
          ))}
          {enCurso && (
            // Not announced word by word; the finished answer is announced once by the log above.
            <div className={styles.assistant} aria-busy="true">
              {enCurso.texto !== '' && <RichText texto={closeOpenBold(enCurso.texto)} />}
              {(enCurso.texto === '' || enCurso.herramienta) && <Thinking herramienta={enCurso.herramienta} />}
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
