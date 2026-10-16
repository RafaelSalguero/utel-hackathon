// Promotion palettes are content (they are drawn into the PNG), not app theme,
// so they are plain hex values.

export type Palette = { readonly fondo: string; readonly texto: string; readonly acento: string };
export type NamedPalette = Palette & { readonly id: string; readonly nombre: string };

export const PALETAS_PREDEFINIDAS: readonly NamedPalette[] = [
  { id: 'terracota', nombre: 'Terracota', fondo: '#A3360F', texto: '#FFFFFF', acento: '#FFE7C2' },
  { id: 'marino', nombre: 'Marino', fondo: '#1E3A5F', texto: '#FFFFFF', acento: '#FFD27A' },
  { id: 'bosque', nombre: 'Bosque', fondo: '#2F5D3A', texto: '#FFFFFF', acento: '#F6E7B0' },
];

export const CONTRASTE_MINIMO = 4.5;

const HEX = /^#[0-9a-f]{6}$/i;

export const isHex = (color: string): boolean => HEX.test(color);

const channel = (valor: number): number => {
  const c = valor / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

export const luminance = (hex: string): number => {
  const n = Number.parseInt(hex.slice(1), 16);
  const r = channel((n >> 16) & 255);
  const g = channel((n >> 8) & 255);
  const b = channel(n & 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

export const contrastRatio = (a: string, b: string): number => {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
};

// Text on the background and the label (background-colored text on the accent) must both be legible.
export const isReadable = (p: Palette): boolean =>
  isHex(p.fondo) &&
  isHex(p.texto) &&
  isHex(p.acento) &&
  contrastRatio(p.fondo, p.texto) >= CONTRASTE_MINIMO &&
  contrastRatio(p.fondo, p.acento) >= CONTRASTE_MINIMO;

// The AI palette first when it is readable, then the predefined ones.
export const paletteOptions = (sugerida: Palette | null): readonly NamedPalette[] =>
  sugerida !== null && isReadable(sugerida)
    ? [{ id: 'ia', nombre: 'Sugerida por IA', ...sugerida }, ...PALETAS_PREDEFINIDAS]
    : PALETAS_PREDEFINIDAS;
