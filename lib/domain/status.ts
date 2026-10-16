import type { ProductMetrics, StockStatus } from './types';

export const UMBRALES = { diasCriticos: 7, diasSinVenta: 30 } as const;

export const toStatus = (
  m: Pick<ProductMetrics, 'diasParaAgotarse' | 'unidades30d'>,
  stock: number,
): StockStatus => {
  if (stock > 0 && m.unidades30d === 0) return 'lento';
  if (m.diasParaAgotarse !== null && m.diasParaAgotarse <= UMBRALES.diasCriticos) return 'por_agotarse';
  return 'sano';
};

export const STATUS_LABEL: Readonly<Record<StockStatus, string>> = {
  por_agotarse: 'Por agotarse',
  lento: 'Lento',
  sano: 'Sano',
};

// Lower is more urgent: used to sort lists and to pick a group's status.
export const STATUS_PRIORIDAD: Readonly<Record<StockStatus, number>> = {
  por_agotarse: 0,
  lento: 1,
  sano: 2,
};
