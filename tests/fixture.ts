import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import Papa from 'papaparse';
import { buildStoreData } from '@/lib/csv';
import type { RawCsv } from '@/lib/csv/parse';
import type { ChatDataset } from '@/lib/ai/schemas';
import type { StoreData } from '@/lib/domain/types';
import { selectChatDataset, selectEventPlans, selectGroups, selectKpis, selectPairs } from '@/state/selectors';

// Same options as lib/csv/parse.ts, on a string instead of a File.
export const parseText = (texto: string): RawCsv => {
  const { data, meta } = Papa.parse<Record<string, string>>(texto, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase(),
  });
  return { filas: data, columnas: meta.fields ?? [] };
};

export const loadExampleDataset = (): ChatDataset => {
  const data = loadExample();
  const grupos = selectGroups(data);
  const kpis = selectKpis(data, grupos);
  const hoy = data.fechaCorte ?? '2026-10-13';
  return selectChatDataset(data, grupos, kpis, { parejas: selectPairs(data, grupos), eventos: selectEventPlans(grupos, hoy) });
};

export const loadExample = (): StoreData => {
  const texto = readFileSync(fileURLToPath(new URL('../public/ejemplo-tienda.csv', import.meta.url)), 'utf8');
  const r = buildStoreData(parseText(texto));
  if (!r.ok) throw new Error(r.error);
  return r.value;
};
