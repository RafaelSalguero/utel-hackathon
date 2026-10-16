import { describe, expect, it } from 'vitest';
import { daysUntilStockout, isInWindow, percentChange, weeklyTrend } from '@/lib/domain/metrics';
import { selectAlerts, selectGroups, selectKpis, selectTopProducts } from '@/state/selectors';
import { loadExample } from './fixture';

describe('pure helpers', () => {
  it('handles division by zero', () => {
    expect(daysUntilStockout(10, 0)).toBeNull();
    expect(percentChange(5, 0)).toBeNull();
    expect(daysUntilStockout(7, 2)).toBe(3.5);
  });

  it('windows end at the cutoff date, inclusive', () => {
    expect(isInWindow('2026-10-13', '2026-10-13', 7)).toBe(true);
    expect(isInWindow('2026-10-07', '2026-10-13', 7)).toBe(true);
    expect(isInWindow('2026-10-06', '2026-10-13', 7)).toBe(false);
    expect(isInWindow('2026-10-06', '2026-10-13', 7, 1)).toBe(true);
  });

  it('compares the last 3 weeks with the previous 3', () => {
    expect(weeklyTrend([0, 0, 1, 1, 1, 2, 2, 2])).toBe(1);
  });
});

describe('example store (section 15 of the plan)', () => {
  const data = loadExample();
  const grupos = selectGroups(data);
  const kpis = selectKpis(data, grupos);

  it('matches the verified KPIs', () => {
    expect(Math.round(kpis.ventas7d)).toBe(96_697);
    expect(Math.round(kpis.ventas30d)).toBe(384_527);
    expect(kpis.cambio7d).toBeCloseTo(0.11, 2);
    expect(kpis.cambio30d).toBeCloseTo(0.1, 2);
    expect(kpis.unidadesStock).toBe(1006);
    expect(Math.round(kpis.valorInventario)).toBe(427_426);
    expect(grupos).toHaveLength(37);
  });

  it('ranks the best sellers', () => {
    const top = selectTopProducts(grupos).map((g) => [g.producto, g.unidades30d]);
    expect(top).toEqual([
      ['Sudadera oversize', 144],
      ['Labial mate rojo', 137],
      ['Labial mate nude', 69],
      ['Vestido floral midi', 54],
      ['Chamarra acolchada', 51],
    ]);
  });

  it('finds the products about to sell out and the slow ones', () => {
    const porAgotarse = grupos.filter((g) => g.status === 'por_agotarse').map((g) => g.producto).sort();
    expect(porAgotarse).toEqual(['Chamarra acolchada', 'Labial mate rojo', 'Sudadera oversize', 'Tenis blancos', 'Vestido floral midi']);
    const lentos = grupos.filter((g) => g.status === 'lento').map((g) => g.producto).sort();
    expect(lentos).toEqual(['Audífonos inalámbricos', 'Bocina bluetooth portátil', 'Short de mezclilla', 'Tarjeta de regalo', 'Vela aromática lavanda']);
    expect(selectAlerts(grupos)).toEqual({ porAgotarse: 5, lentos: 5 });
  });

  it('computes days until stockout per variant', () => {
    const vestido = grupos.find((g) => g.producto === 'Vestido floral midi');
    expect(vestido?.critica?.producto.variante).toBe('M / Azul');
    expect(vestido?.critica?.metrics.diasParaAgotarse).toBeCloseTo(2.9, 1);
    const vela = grupos.find((g) => g.producto === 'Vela aromática lavanda')?.variantes[0].metrics;
    expect(vela?.diasSinVenta).toBe(34);
  });

  it('detects the seasonal trends', () => {
    const tendencia = (nombre: string) => grupos.find((g) => g.producto === nombre)?.tendencia ?? NaN;
    expect(tendencia('Chamarra acolchada')).toBeCloseTo(1.21, 2);
    expect(tendencia('Short de mezclilla')).toBe(-1);
  });
});
