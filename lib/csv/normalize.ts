import { maxBy, uniqBy } from 'lodash-es';
import { classifyProduct } from '@/lib/domain/categories';
import type { Product, Sale } from '@/lib/domain/types';
import type { ValidRow } from './validate';

const rowToProduct = (row: ValidRow): Product => ({
  sku: row.sku,
  producto: row.producto,
  variante: row.variante,
  categoriaOriginal: row.categoria,
  categoria: classifyProduct(row.producto, row.categoria),
  precio: row.precio,
  costo: row.costo,
  stock: row.stock,
});

// One product per sku; the first row wins.
export const toProducts = (rows: readonly ValidRow[]): readonly Product[] => {
  const primeraPorSku = uniqBy(rows, 'sku');
  return primeraPorSku.map((row) => rowToProduct(row));
};

export const toSales = (rows: readonly ValidRow[]): readonly Sale[] =>
  rows.flatMap((row) =>
    row.venta === null
      ? []
      : [{ sku: row.sku, fecha: row.venta.fecha, idPedido: row.venta.idPedido, cantidad: row.venta.cantidad, precioVenta: row.venta.precioVenta }],
  );

export const latestDate = (ventas: readonly Sale[]): string | null => maxBy(ventas, 'fecha')?.fecha ?? null;
