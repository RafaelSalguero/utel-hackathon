import { describe, expect, it } from 'vitest';
import { ChatDatasetSchema } from '@/lib/ai/schemas';
import { findProducts, rankProducts, riskProducts, storeOverview } from '@/lib/domain/insights';
import { splitLines } from '@/lib/format/ndjson';
import { nextReveal } from '@/lib/format/reveal';
import { closeOpenBold, parseRichText } from '@/lib/format/richText';
import { selectChatDataset, selectGroups, selectKpis } from '@/state/selectors';
import { loadExample } from './fixture';

describe('chat dataset for the example store', () => {
  const data = loadExample();
  const grupos = selectGroups(data);
  const ds = selectChatDataset(data, grupos, selectKpis(data, grupos));

  it('is valid for the API and small enough to send', () => {
    expect(ChatDatasetSchema.safeParse(ds).success).toBe(true);
    expect(ds.productos).toHaveLength(37);
    expect(JSON.stringify(ds).length).toBeLessThan(60_000);
  });

  it('ranks best sellers like the dashboard', () => {
    const top = rankProducts(ds, { criterio: 'unidades30d', orden: 'desc', limite: 2 }).productos.map((p) => p.producto);
    expect(top).toEqual(['Sudadera oversize', 'Labial mate rojo']);
  });

  it('computes ROI from price and cost', () => {
    const labial = findProducts(ds, 'labial mate rojo')[0];
    expect(labial.roi).toBeCloseTo((189 - 60) / 60, 2);
    const mejor = rankProducts(ds, { criterio: 'roi', orden: 'desc', limite: 1 }).productos[0];
    expect(mejor.roi).toBe(Math.max(...ds.productos.map((p) => p.roi ?? -Infinity)));
  });

  it('filters rankings by category, ignoring accents and case', () => {
    const r = rankProducts(ds, { criterio: 'ingresos30d', orden: 'desc', limite: 20, categoria: 'electronica' });
    expect(r.productos.length).toBeGreaterThan(0);
    expect(r.productos.every((p) => p.categoria === 'Electrónica')).toBe(true);
  });

  it('lists risks in order of urgency', () => {
    const r = riskProducts(ds, 'todos');
    expect(r.porAgotarse?.[0].producto).toBe('Tenis blancos');
    expect(r.lentos).toHaveLength(5);
    expect(storeOverview(ds)).toMatchObject({ porAgotarse: 5, lentos: 5 });
  });

  it('finds products by partial name or sku', () => {
    expect(findProducts(ds, 'sudadera')[0].producto).toBe('Sudadera oversize');
    expect(findProducts(ds, 'VES-001-1')[0].producto).toBe('Vestido floral midi');
    expect(findProducts(ds, 'helicóptero')).toHaveLength(0);
  });

  it('summarizes categories', () => {
    const ropa = ds.categorias.find((c) => c.categoria === 'Ropa');
    expect(ropa?.productos).toBe(8);
    expect(ropa?.porAgotarse).toBe(3);
  });
});

describe('streaming helpers', () => {
  it('splits NDJSON and keeps the unfinished line', () => {
    expect(splitLines('{"t":"texto"}\n{"t":"fi')).toEqual({ lineas: ['{"t":"texto"}'], resto: '{"t":"fi' });
    expect(splitLines('a\n\nb\n')).toEqual({ lineas: ['a', 'b'], resto: '' });
  });

  it('reveals a burst word by word and finishes', () => {
    const texto = 'Tu producto más vendido es la Sudadera oversize con 144 unidades. '.repeat(15);
    const pasos = [];
    let mostrado = 0;
    while (mostrado < texto.length) {
      mostrado = nextReveal(texto, mostrado);
      pasos.push(mostrado);
    }
    expect(pasos.length).toBeGreaterThan(20); // not all at once
    expect(pasos.length).toBeLessThan(120); // ~3.6 s at most at 30 ms per tick
    expect(pasos.slice(0, -1).every((n) => texto[n] === ' ')).toBe(true); // stops between words
    expect(nextReveal('hola', 4)).toBe(4);
  });

  it('closes bold that is still being written', () => {
    expect(closeOpenBold('Tu top es **Sud')).toBe('Tu top es **Sud**');
    expect(closeOpenBold('**Sudadera** listo')).toBe('**Sudadera** listo');
  });
});

describe('parseRichText', () => {
  it('handles paragraphs, list items and bold without HTML', () => {
    const bloques = parseRichText('Tu top es **Sudadera** con 144.\n- **Labial**: 137\n\n<b>x</b>');
    expect(bloques).toHaveLength(3);
    expect(bloques[0].segmentos).toEqual([
      { texto: 'Tu top es ', negrita: false },
      { texto: 'Sudadera', negrita: true },
      { texto: ' con 144.', negrita: false },
    ]);
    expect(bloques[1].tipo).toBe('item');
    expect(bloques[2].segmentos[0].texto).toBe('<b>x</b>');
  });
});
