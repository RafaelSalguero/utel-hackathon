import { err, ok, type Result } from '@/lib/fp/result';
import type { StoreData } from '@/lib/domain/types';
import { latestDate, toProducts, toSales } from './normalize';
import type { RawCsv } from './parse';
import { checkColumns, validateRows } from './validate';

export const buildStoreData = ({ filas, columnas }: RawCsv): Result<StoreData> => {
  if (filas.length === 0) return err('El archivo está vacío.');

  const revision = checkColumns(columnas);
  if (!revision.ok) return revision;

  const { validas, errores } = validateRows(filas);
  if (validas.length === 0) return err('Ninguna fila es válida. Revisa que el archivo use el formato de la plantilla.');

  const productos = toProducts(validas);
  const ventas = toSales(validas);
  const fechaCorte = latestDate(ventas);

  return ok({ productos, ventas, errores, fechaCorte });
};
