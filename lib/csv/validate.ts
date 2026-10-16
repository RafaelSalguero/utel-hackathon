import { z } from 'zod';
import { isIsoDate } from '@/lib/format/dates';
import { err, ok, type Result } from '@/lib/fp/result';
import type { RowError } from '@/lib/domain/types';
import { COLUMNAS_REQUERIDAS, TODAS_LAS_COLUMNAS, filaEnArchivo, type Columna } from './columns';

const MAX_TEXTO = 120;

const cleanNumber = (texto: string): string => texto.replace(/[$,\s]/g, '');

const isAmount = (texto: string): boolean => /^\d+(\.\d+)?$/.test(cleanNumber(texto));
const isInteger = (texto: string): boolean => /^\d+$/.test(cleanNumber(texto));

const VentaSchema = z.object({
  fecha: z.string(),
  idPedido: z.string(),
  cantidad: z.number().int().positive(),
});

const RowSchema = z
  .object({
    sku: z.string().min(1, 'SKU vacío').max(MAX_TEXTO, 'SKU demasiado largo'),
    producto: z.string().min(1, 'nombre de producto vacío').max(MAX_TEXTO, 'nombre demasiado largo'),
    variante: z.string().max(MAX_TEXTO),
    categoria: z.string().max(MAX_TEXTO),
    precio: z.string(),
    costo: z.string(),
    stock: z.string(),
    precio_venta: z.string(),
    fecha_venta: z.string(),
    id_pedido: z.string(),
    cantidad: z.string(),
  })
  .superRefine((row, ctx) => {
    const issue = (message: string) => ctx.addIssue({ code: 'custom', message });

    if (row.precio === '') issue('precio vacío');
    else if (!isAmount(row.precio)) issue(`precio "${row.precio}" no es un número`);

    if (row.stock === '') issue('stock vacío');
    else if (!isInteger(row.stock)) issue(`stock "${row.stock}" no es un número entero`);

    if (row.costo !== '' && !isAmount(row.costo)) issue(`costo "${row.costo}" no es un número`);
    if (row.precio_venta !== '' && !isAmount(row.precio_venta)) issue(`precio_venta "${row.precio_venta}" no es un número`);

    const venta = [row.fecha_venta, row.id_pedido, row.cantidad];
    const llenas = venta.filter((v) => v !== '').length;
    if (llenas > 0 && llenas < venta.length) {
      issue('venta incompleta: fecha_venta, id_pedido y cantidad van juntas');
      return;
    }
    if (llenas === 0) return;

    if (!isIsoDate(row.fecha_venta)) issue(`fecha "${row.fecha_venta}" no tiene formato AAAA-MM-DD`);
    if (!isInteger(row.cantidad) || Number(cleanNumber(row.cantidad)) === 0) issue(`cantidad "${row.cantidad}" no es válida`);
  })
  .transform((row) => {
    const precio = Number(cleanNumber(row.precio));
    const venta =
      row.fecha_venta === ''
        ? null
        : VentaSchema.parse({ fecha: row.fecha_venta, idPedido: row.id_pedido, cantidad: Number(cleanNumber(row.cantidad)) });
    return {
      sku: row.sku,
      producto: row.producto,
      variante: row.variante === '' ? null : row.variante,
      categoria: row.categoria === '' ? null : row.categoria,
      precio,
      costo: row.costo === '' ? null : Number(cleanNumber(row.costo)),
      stock: Number(cleanNumber(row.stock)),
      venta: venta === null ? null : { ...venta, precioVenta: row.precio_venta === '' ? precio : Number(cleanNumber(row.precio_venta)) },
    };
  });

export type ValidRow = z.output<typeof RowSchema>;

// Every known column as a trimmed string ('' when missing), so the schema sees one shape.
const pickColumns = (raw: Record<string, string>): Record<Columna, string> =>
  Object.fromEntries(TODAS_LAS_COLUMNAS.map((c) => [c, (raw[c] ?? '').trim()])) as Record<Columna, string>;

export const checkColumns = (columnas: readonly string[]): Result<true> => {
  const faltantes = COLUMNAS_REQUERIDAS.filter((c) => !columnas.includes(c));
  if (faltantes.length === 0) return ok(true);
  return err(`Faltan columnas obligatorias: ${faltantes.join(', ')}. Descarga la plantilla para ver el formato.`);
};

export const validateRows = (
  filas: readonly Record<string, string>[],
): { readonly validas: readonly ValidRow[]; readonly errores: readonly RowError[] } => {
  const resultados = filas.map((raw, i) => ({ fila: filaEnArchivo(i), r: RowSchema.safeParse(pickColumns(raw)) }));
  const validas = resultados.flatMap(({ r }) => (r.success ? [r.data] : []));
  const errores = resultados.flatMap(({ fila, r }) => (r.success ? [] : [{ fila, motivo: r.error.issues[0]?.message ?? 'fila inválida' }]));
  return { validas, errores };
};
