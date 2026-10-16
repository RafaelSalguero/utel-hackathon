import type { Category, CategoryId } from './types';

export const CATEGORIES: Readonly<Record<CategoryId, Category>> = {
  calzado: { id: 'calzado', nombre: 'Calzado', emoji: '👟' },
  ropa: { id: 'ropa', nombre: 'Ropa', emoji: '👕' },
  belleza: { id: 'belleza', nombre: 'Belleza', emoji: '💄' },
  electronica: { id: 'electronica', nombre: 'Electrónica', emoji: '🎧' },
  accesorios: { id: 'accesorios', nombre: 'Accesorios', emoji: '👜' },
  hogar: { id: 'hogar', nombre: 'Hogar', emoji: '🏠' },
  alimentos: { id: 'alimentos', nombre: 'Alimentos', emoji: '☕' },
  juguetes: { id: 'juguetes', nombre: 'Juguetes', emoji: '🧸' },
  deportes: { id: 'deportes', nombre: 'Deportes', emoji: '⚽' },
  mascotas: { id: 'mascotas', nombre: 'Mascotas', emoji: '🐾' },
  papeleria: { id: 'papeleria', nombre: 'Papelería', emoji: '✏️' },
  otros: { id: 'otros', nombre: 'Otros', emoji: '📦' },
};

// Order matters: the first match wins. Patterns run on lowercase text without accents.
// Calzado goes before belleza ("botas de piel"), electrónica before accesorios
// ("accesorios para celular") and mascotas before accesorios ("collar para perro").
const RULES: readonly { readonly id: CategoryId; readonly pattern: RegExp }[] = [
  { id: 'calzado', pattern: /\b(tenis|botas?|botines?|sandalias?|zapat\w*|mocasin\w*|calzado|huarache\w*|chanclas?|tacones?)\b/ },
  { id: 'mascotas', pattern: /\b(mascotas?|perros?|gatos?|croquetas?)\b/ },
  { id: 'electronica', pattern: /\b(audifonos?|audio|bocinas?|cargador\w*|usb|celular\w*|electronic\w*|bluetooth|cables?|smartwatch|tablet)\b/ },
  { id: 'belleza', pattern: /\b(labial\w*|delineador\w*|maquillaje|esmaltes?|unas|cremas?|perfum\w*|fragancias?|shampoo|champu|cabello|cuidado de la piel|belleza|rimel|serum|cosmetic\w*)\b/ },
  { id: 'ropa', pattern: /\b(blusas?|vestidos?|playeras?|camis\w*|sudaderas?|chamarras?|pantalon\w*|shorts?|pijamas?|faldas?|ropa|jeans?|sueter\w*|abrigos?|chalecos?|calcetines?)\b/ },
  { id: 'accesorios', pattern: /\b(bolsas?|gorras?|lentes|bufandas?|collar\w*|joyeria|mochilas?|accesorios?|relojes?|carteras?|aretes?|pulseras?|cinturon\w*|sombreros?)\b/ },
  { id: 'hogar', pattern: /\b(velas?|cojin\w*|decoracion|decorativ\w*|tazas?|cocina|hogar|calaverita\w*|platos?|manteles?|toallas?|macetas?)\b/ },
  { id: 'alimentos', pattern: /\b(cafe|chocolate|miel|alimentos?|galletas?|salsas?|dulces?|mermelada\w*|botanas?)\b/ },
  { id: 'juguetes', pattern: /\b(juguetes?|munecas?|peluches?|rompecabezas|juegos? de mesa)\b/ },
  { id: 'deportes', pattern: /\b(deport\w*|balon\w*|pelotas?|yoga|pesas?|bicicleta\w*|fitness)\b/ },
  { id: 'papeleria', pattern: /\b(papeleria|cuadernos?|libretas?|plumas?|lapi(z|ces)|agendas?|marcadores?)\b/ },
];

const normalizeText = (texto: string): string =>
  texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const matchRule = (texto: string): Category | null => {
  const normalizado = normalizeText(texto);
  const regla = RULES.find((r) => r.pattern.test(normalizado));
  return regla ? CATEGORIES[regla.id] : null;
};

// The store's own category is the strongest hint; the product name is the fallback.
export const classifyProduct = (producto: string, categoria: string | null): Category => {
  const porCategoria = categoria ? matchRule(categoria) : null;
  if (porCategoria) return porCategoria;
  const porNombre = matchRule(producto);
  return porNombre ?? CATEGORIES.otros;
};
