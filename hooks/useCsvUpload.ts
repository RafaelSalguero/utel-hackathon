'use client';

import { useState } from 'react';
import { buildStoreData } from '@/lib/csv';
import { TAMANO_MAXIMO } from '@/lib/csv/columns';
import { parseCsv } from '@/lib/csv/parse';
import { formatBytes } from '@/lib/format/money';
import { err, type Result } from '@/lib/fp/result';
import { useStore } from './useStore';

const EJEMPLO_URL = '/ejemplo-tienda.csv';

export const useCsvUpload = () => {
  const { dispatch } = useStore();
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargarArchivo = async (file: File): Promise<Result<true>> => {
    if (!file.name.toLowerCase().endsWith('.csv')) return err('El archivo debe ser .csv');
    if (file.size > TAMANO_MAXIMO) return err(`El archivo pesa ${formatBytes(file.size)}; el máximo es ${formatBytes(TAMANO_MAXIMO)}.`);

    const crudo = await parseCsv(file);
    if (!crudo.ok) return crudo;

    const data = buildStoreData(crudo.value);
    if (!data.ok) return data;

    dispatch({ type: 'cargar', data: data.value, archivo: { nombre: file.name, tamano: file.size } });
    return { ok: true, value: true };
  };

  const run = async (obtener: () => Promise<File>): Promise<boolean> => {
    setCargando(true);
    setError(null);
    try {
      const file = await obtener();
      const r = await cargarArchivo(file);
      if (!r.ok) setError(r.error);
      return r.ok;
    } catch {
      setError('No se pudo leer el archivo. Intenta de nuevo.');
      return false;
    } finally {
      setCargando(false);
    }
  };

  const subir = (file: File) => run(() => Promise.resolve(file));

  const usarEjemplo = () =>
    run(async () => {
      const res = await fetch(EJEMPLO_URL);
      if (!res.ok) throw new Error('example not found');
      const blob = await res.blob();
      return new File([blob], 'ejemplo-tienda.csv', { type: 'text/csv' });
    });

  return { subir, usarEjemplo, cargando, error };
};
