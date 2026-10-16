export type CategoryId =
  | 'calzado' | 'ropa' | 'belleza' | 'electronica' | 'accesorios' | 'hogar'
  | 'alimentos' | 'juguetes' | 'deportes' | 'mascotas' | 'papeleria' | 'otros';

export type Category = { readonly id: CategoryId; readonly nombre: string; readonly emoji: string };

export type Product = {
  readonly sku: string;
  readonly producto: string;
  readonly variante: string | null;
  readonly categoriaOriginal: string | null;
  readonly categoria: Category;
  readonly precio: number;
  readonly costo: number | null;
  readonly stock: number;
};

export type Sale = {
  readonly sku: string;
  readonly fecha: string; // YYYY-MM-DD
  readonly idPedido: string;
  readonly cantidad: number;
  readonly precioVenta: number;
};

export type StockStatus = 'por_agotarse' | 'lento' | 'sano';

export type ProductMetrics = {
  readonly sku: string;
  readonly unidades7d: number;
  readonly unidades30d: number;
  readonly ingresos30d: number;
  readonly ventaDiaria: number; // units per day (28-day average)
  readonly diasParaAgotarse: number | null; // null if there are no sales
  readonly diasSinVenta: number | null; // null if it never sold
  readonly ventasPorSemana: readonly number[]; // last 8 weeks, oldest first
  readonly status: StockStatus;
};

// A product as the store owner thinks of it: every variant (size, color) of one name.
export type ProductVariant = { readonly producto: Product; readonly metrics: ProductMetrics };

export type ProductGroup = {
  readonly id: string; // sku of the first variant; used in routes
  readonly producto: string;
  readonly categoria: Category;
  readonly precio: number;
  readonly stock: number;
  readonly variantes: readonly ProductVariant[];
  readonly unidades30d: number;
  readonly ingresos30d: number;
  readonly ventasPorSemana: readonly number[];
  readonly status: StockStatus;
  readonly critica: ProductVariant | null; // variant closest to selling out
  readonly tendencia: number | null; // last 3 weeks vs. the previous 3
};

export type RowError = { readonly fila: number; readonly motivo: string };

export type StoreData = {
  readonly productos: readonly Product[];
  readonly ventas: readonly Sale[];
  readonly errores: readonly RowError[];
  readonly fechaCorte: string | null; // the most recent sale date in the file; null without sales
};
