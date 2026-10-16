import { describe, expect, it } from 'vitest';
import { featuredPairs } from '@/lib/domain/basket';
import { EVENTOS, eventDate, upcomingEvents } from '@/lib/domain/calendar';
import { estimateElasticities, simulate, whatIfCandidates } from '@/lib/domain/whatif';
import { selectEventPlans, selectGroups, selectPairs } from '@/state/selectors';
import { loadExample, loadExampleDataset } from './fixture';

const regla = (id: string) => EVENTOS.find((e) => e.id === id)!.regla;

describe('retail calendar', () => {
  it('computes moving dates with weekday rules', () => {
    expect(eventDate(regla('buen_fin'), 2025)).toBe('2025-11-13'); // Buen Fin 2025: Nov 13-17
    expect(eventDate(regla('buen_fin'), 2026)).toBe('2026-11-12');
    expect(eventDate(regla('dia_padre'), 2026)).toBe('2026-06-21'); // 3rd Sunday of June
    expect(eventDate(regla('hot_sale'), 2025)).toBe('2025-05-26'); // last Monday of May
    expect(eventDate(regla('dia_madres'), 2027)).toBe('2027-05-10');
  });

  it('lists the next dates from the cutoff, rolling into next year', () => {
    expect(upcomingEvents('2026-10-13').map((e) => [e.evento.id, e.diasRestantes])).toEqual([
      ['dia_muertos', 19],
      ['buen_fin', 30],
      ['navidad', 72],
    ]);
    expect(upcomingEvents('2026-12-30', 1)[0].fecha).toBe('2027-01-06');
  });

  it('checks stock readiness and finds slow stock that fits the date', () => {
    const data = loadExample();
    const grupos = selectGroups(data);
    const [muertos] = selectEventPlans(grupos, '2026-10-13');
    expect(muertos.clave.map((p) => p.producto)).toContain('Calaverita decorativa');
    const calaverita = muertos.clave.find((p) => p.producto === 'Calaverita decorativa')!;
    expect(calaverita.preparacion).toBe('se_agota_antes'); // 7 pieces, ~8 days left, event in 19
    expect(calaverita.pedirMas).toBeGreaterThan(0);
    expect(muertos.oportunidades.map((o) => o.producto)).toContain('Vela aromática lavanda');
  });
});

describe('lo que se compra junto', () => {
  const data = loadExample();
  const grupos = selectGroups(data);
  const pares = selectPairs(data, grupos);

  it('finds pairs that co-occur more than chance', () => {
    expect(pares[0]).toMatchObject({ pedidos: 35 });
    expect([pares[0].a.producto, pares[0].b.producto].sort()).toEqual(['Labial mate nude', 'Labial mate rojo']);
    expect(pares.every((p) => p.pedidos >= 8 && p.lift >= 1.5)).toBe(true);
  });

  it('features actionable pairs first', () => {
    const destacados = featuredPairs(pares);
    expect(destacados[0].oportunidad).toBe('liquidar_en_kit');
    expect([destacados[0].a.estado, destacados[0].b.estado]).toContain('lento');
    expect(destacados.map((p) => p.oportunidad)).toEqual(expect.arrayContaining(['riesgo_doble', 'kit']));
    expect(pares.some((p) => [p.a.producto, p.b.producto].includes('Vela aromática lavanda'))).toBe(true);
  });
});

describe('¿Y si…? simulator', () => {
  const data = loadExample();
  const grupos = selectGroups(data);
  const ds = loadExampleDataset();

  it('estimates price response from discounted days', () => {
    const tabla = estimateElasticities(data.ventas, grupos);
    expect(tabla.fuenteTienda).toBe('tienda');
    expect(tabla.tienda).toBeGreaterThan(0.3);
    expect(tabla.porProducto[grupos.find((g) => g.producto === 'Sudadera oversize')!.id].fuente).toBe('producto');
  });

  it('never sells more than the stock', () => {
    const sudadera = ds.productos.find((p) => p.producto === 'Sudadera oversize')!;
    const p = simulate(sudadera, { tipo: 'precio', cambioPct: -10 });
    expect(p.despues.unidades).toBeLessThanOrEqual(sudadera.stock);
    expect(p.despues.ganancia!).toBeLessThan(p.antes.ganancia!); // already selling out: a discount only loses margin
  });

  it('a restock recovers lost sales', () => {
    const sudadera = ds.productos.find((p) => p.producto === 'Sudadera oversize')!;
    const cubreElMes = Math.ceil(sudadera.ventaDiaria * 30 - sudadera.stock);
    const p = simulate(sudadera, { tipo: 'reposicion', unidades: cubreElMes });
    expect(p.antes.ventasPerdidas).toBeGreaterThan(0);
    expect(p.despues.ventasPerdidas).toBe(0);
    expect(p.despues.ingresos).toBeGreaterThan(p.antes.ingresos);
  });

  it('builds varied candidates from the data', () => {
    const ids = whatIfCandidates(ds).map((c) => c.id);
    expect(ids.length).toBeGreaterThanOrEqual(5);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual(expect.arrayContaining(['liquidar_lento', 'reponer_critico', 'descuento_critico']));
  });
});
