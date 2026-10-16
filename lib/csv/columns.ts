export const COLUMNAS_REQUERIDAS = ['sku', 'producto', 'precio', 'stock'] as const;
export const COLUMNAS_OPCIONALES = ['variante', 'categoria', 'costo', 'precio_venta'] as const;
export const COLUMNAS_VENTA = ['fecha_venta', 'id_pedido', 'cantidad'] as const;

export const TODAS_LAS_COLUMNAS = [...COLUMNAS_REQUERIDAS, ...COLUMNAS_OPCIONALES, ...COLUMNAS_VENTA] as const;

export type Columna = (typeof TODAS_LAS_COLUMNAS)[number];

export const TAMANO_MAXIMO = 5 * 1024 * 1024; // 5 MB

// Row 1 is the header, so the first data row is row 2 in a spreadsheet.
export const filaEnArchivo = (indice: number): number => indice + 2;
