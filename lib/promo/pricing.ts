import type { PromoTipo } from '@/lib/ai/schemas';
import { formatMoney } from '@/lib/format/money';

export const DESCUENTOS = [10, 15, 20, 30, 40] as const;

// Prices are always computed by the app, never written by the AI.
export const discountedPrice = (precio: number, descuento: number): number => Math.round(precio * (1 - descuento / 100));

export type PriceLine = { readonly antes: string | null; readonly ahora: string; readonly nota: string | null };

export const priceLine = (tipo: PromoTipo, precio: number, descuento: number | null): PriceLine => {
  if (tipo === 'descuento' && descuento !== null) {
    return { antes: formatMoney(precio), ahora: formatMoney(discountedPrice(precio, descuento)), nota: null };
  }
  if (tipo === '2x1') return { antes: null, ahora: formatMoney(precio), nota: 'lleva 2, paga 1' };
  return { antes: null, ahora: formatMoney(precio), nota: null };
};
