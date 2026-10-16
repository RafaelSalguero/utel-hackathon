import { describe, expect, it } from 'vitest';
import { PALETAS_PREDEFINIDAS, contrastRatio, isReadable, paletteOptions } from '@/lib/promo/palette';
import { discountedPrice, priceLine } from '@/lib/promo/pricing';
import { productUrl } from '@/lib/promo/qr';

describe('pricing', () => {
  it('computes the discounted price in code', () => {
    expect(discountedPrice(490, 20)).toBe(392);
    expect(priceLine('descuento', 490, 20)).toEqual({ antes: '$490', ahora: '$392', nota: null });
    expect(priceLine('2x1', 490, null).nota).toBe('lleva 2, paga 1');
  });
});

describe('palette contrast', () => {
  it('computes WCAG contrast', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 0);
  });

  it('keeps every predefined palette readable', () => {
    expect(PALETAS_PREDEFINIDAS.every((p) => isReadable(p))).toBe(true);
  });

  it('drops an AI palette with poor contrast or invalid colors', () => {
    expect(paletteOptions({ fondo: '#FFFF00', texto: '#FFFFFF', acento: '#000000' })).toBe(PALETAS_PREDEFINIDAS);
    expect(paletteOptions({ fondo: 'red', texto: '#FFFFFF', acento: '#000000' })).toBe(PALETAS_PREDEFINIDAS);
    expect(paletteOptions({ fondo: '#111111', texto: '#FFFFFF', acento: '#FFE7C2' })[0].id).toBe('ia');
  });
});

describe('productUrl', () => {
  it('builds a mock product page from the store and product names', () => {
    expect(productUrl('Casa Lupita', 'Chamarra acolchada')).toBe('https://casa-lupita.mitiendanube.com/productos/chamarra-acolchada');
    expect(productUrl('', 'Café de olla molido 250 g')).toBe('https://mitienda.mitiendanube.com/productos/cafe-de-olla-molido-250-g');
  });
});
