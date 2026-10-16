import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import Papa from 'papaparse';
import { buildStoreData } from '@/lib/csv';
import type { RawCsv } from '@/lib/csv/parse';
import type { StoreData } from '@/lib/domain/types';

// Same options as lib/csv/parse.ts, on a string instead of a File.
export const parseText = (texto: string): RawCsv => {
  const { data, meta } = Papa.parse<Record<string, string>>(texto, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase(),
  });
  return { filas: data, columnas: meta.fields ?? [] };
};

export const loadExample = (): StoreData => {
  const texto = readFileSync(fileURLToPath(new URL('../public/ejemplo-tienda.csv', import.meta.url)), 'utf8');
  const r = buildStoreData(parseText(texto));
  if (!r.ok) throw new Error(r.error);
  return r.value;
};
