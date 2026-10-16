import { describe, expect, it } from 'vitest';
import { classifyProduct } from '@/lib/domain/categories';

describe('classifyProduct', () => {
  it('classifies by product name when there is no category', () => {
    expect(classifyProduct('Labial mate rojo', null).id).toBe('belleza');
    expect(classifyProduct('Botas de piel', null).id).toBe('calzado');
    expect(classifyProduct('Kit misterioso', null).id).toBe('otros');
    expect(classifyProduct('Café de olla molido 250 g', null).id).toBe('alimentos');
  });

  it('prefers the store category and handles overlapping words', () => {
    expect(classifyProduct('Cargador USB-C 20W', 'Accesorios para celular').id).toBe('electronica');
    expect(classifyProduct('Crema hidratante facial', 'Cuidado de la piel').id).toBe('belleza');
    expect(classifyProduct('Mocasines de gamuza', 'Zapatos').id).toBe('calzado');
    expect(classifyProduct('Vela aromática lavanda', 'Decoración').id).toBe('hogar');
  });

  it('falls back to the name when the category is unknown', () => {
    expect(classifyProduct('Sudadera oversize', 'Temporada')).toMatchObject({ id: 'ropa' });
  });
});
