import { describe, expect, it } from 'vitest';
import { buildStoreData } from '@/lib/csv';
import { loadExample, parseText } from './fixture';

describe('buildStoreData with the example file', () => {
  const data = loadExample();

  it('groups rows by sku', () => {
    expect(data.productos).toHaveLength(67);
    expect(data.fechaCorte).toBe('2026-10-13');
  });

  it('reports the 6 broken rows by file line', () => {
    expect(data.errores.map((e) => e.fila)).toEqual([122, 372, 622, 872, 1122, 1372]);
    expect(data.errores[0].motivo).toContain('N/A');
  });

  it('keeps every valid sale line', () => {
    expect(data.ventas).toHaveLength(2145);
  });
});

describe('buildStoreData edge cases', () => {
  it('rejects a file missing required columns', () => {
    const r = buildStoreData(parseText('sku,producto\nA,Uno'));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain('precio');
  });

  it('accepts products without sales', () => {
    const r = buildStoreData(parseText('sku,producto,precio,stock\nA,Taza,100,5\nB,Plato,50,0'));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.productos).toHaveLength(2);
      expect(r.value.ventas).toHaveLength(0);
      expect(r.value.fechaCorte).toBeNull();
    }
  });

  it('flags an incomplete sale', () => {
    const r = buildStoreData(parseText('sku,producto,precio,stock,fecha_venta,id_pedido,cantidad\nA,Taza,100,5,2026-10-01,,1'));
    expect(r.ok).toBe(false);
  });
});
