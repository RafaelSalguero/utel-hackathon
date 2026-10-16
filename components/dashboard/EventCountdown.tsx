'use client';

import { CalendarDays } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { useEventPlans } from '@/hooks/useStore';
import type { EventProduct } from '@/lib/domain/calendar';
import { formatShortDate } from '@/lib/format/dates';
import { formatNumber } from '@/lib/format/money';
import { AskAiButton } from './AskAiButton';
import styles from './EventCountdown.module.css';

const dias = (n: number): string => `${formatNumber(Math.max(0, Math.round(n)))} ${Math.round(n) === 1 ? 'día' : 'días'}`;

const readiness = (p: EventProduct): string => {
  const pedir = p.pedirMas > 0 ? ` · pide ~${formatNumber(p.pedirMas)} más` : '';
  if (p.preparacion === 'se_agota_antes') return `Se agota en ~${dias(p.diasParaAgotarse ?? 0)}, antes de la fecha${pedir}`;
  if (p.preparacion === 'se_agota_durante') return `Llega, pero se agota durante la fecha${pedir}`;
  return 'Tu stock alcanza';
};

export function EventCountdown({ fechaCorte }: { readonly fechaCorte: string | null }) {
  const planes = useEventPlans();
  const [elegido, setElegido] = useState(0);
  const plan = planes[elegido];
  if (!plan) return null;
  const { evento } = plan;

  return (
    <section className={styles.card} aria-labelledby="proxima-fecha">
      <p id="proxima-fecha" className={styles.kicker}>
        <CalendarDays size={16} aria-hidden /> Próximas fechas clave
      </p>

      <div className={styles.hero}>
        <span className={styles.emoji} aria-hidden>
          {evento.emoji}
        </span>
        <div>
          <p className={styles.countdown}>
            {plan.diasRestantes === 0 ? '¡Es hoy!' : <><strong>{formatNumber(plan.diasRestantes)}</strong> {plan.diasRestantes === 1 ? 'día' : 'días'}</>}
          </p>
          <p className={styles.eventName}>
            para {evento.nombre} · {formatShortDate(plan.fecha)}
            {evento.aproximada && <span className={styles.approx}> (fecha aprox.)</span>}
          </p>
        </div>
      </div>

      {plan.clave.length > 0 && (
        <ul className={styles.products} aria-label={`Productos clave para ${evento.nombre}`}>
          {plan.clave.map((p) => (
            <li key={p.sku}>
              <Link href={`/inventario/${encodeURIComponent(p.sku)}`} className={styles.product} data-estado={p.preparacion}>
                <span className={styles.productEmoji} aria-hidden>
                  {p.emoji}
                </span>
                <span className={styles.productText}>
                  <span className={styles.productName}>{p.producto}</span>
                  <span className={styles.readiness}>{readiness(p)}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {plan.oportunidades.length > 0 && (
        <p className={styles.opportunity}>
          <strong>Aprovecha para mover:</strong>{' '}
          {plan.oportunidades.map((o) => `${o.producto} (${formatNumber(o.stock)} piezas sin venderse)`).join(', ')}
        </p>
      )}

      <div className={styles.footer}>
        <AskAiButton pregunta={`¿Cómo me preparo para ${evento.nombre}? Faltan ${plan.diasRestantes} días.`} label="¿Cómo me preparo?" />
      </div>

      {planes.length > 1 && (
        <div className={styles.tabs} role="group" aria-label="Elegir fecha">
          {planes.map((p, i) => (
            <button key={p.evento.id} type="button" className={styles.tab} aria-pressed={i === elegido} onClick={() => setElegido(i)}>
              <span aria-hidden>{p.evento.emoji}</span> {p.evento.nombre} · {dias(p.diasRestantes)}
            </button>
          ))}
        </div>
      )}

      {fechaCorte && <p className={styles.note}>Contado desde el {formatShortDate(fechaCorte)}, la última venta de tu archivo, al ritmo de venta actual.</p>}
    </section>
  );
}
