import Papa from 'papaparse';
import { err, ok, type Result } from '@/lib/fp/result';

export type RawCsv = {
  readonly filas: readonly Record<string, string>[];
  readonly columnas: readonly string[];
};

// Edge: the only place with read effects.
export const parseCsv = (file: File): Promise<Result<RawCsv>> =>
  new Promise((resolve) =>
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().toLowerCase(),
      complete: ({ data, meta }) => resolve(ok({ filas: data, columnas: meta.fields ?? [] })),
      error: (e) => resolve(err(`No se pudo leer el archivo: ${e.message}`)),
    }),
  );
