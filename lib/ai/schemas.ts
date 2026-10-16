import { z } from 'zod';

// ---- AI Summary ------------------------------------------------------------

export const AiSummarySchema = z.object({
  recomendaciones: z
    .array(
      z.object({
        sku: z.string().nullable(),
        titulo: z.string().max(60), // e.g. "Vestido floral midi"
        texto: z.string().max(160), // e.g. "se agota en ~4 días al ritmo actual. Reponer talla M."
        accion: z.enum(['reponer', 'promocionar', 'liquidar', 'revisar']),
      }),
    )
    .min(1)
    .max(3),
  datosInsuficientes: z.boolean(),
});

export type AiSummary = z.infer<typeof AiSummarySchema>;

const nombre = z.string().max(80);

// What the client sends: aggregates only, never the CSV.
export const SummaryInputSchema = z.object({
  fechaCorte: z.string().nullable(),
  kpis: z.object({
    ventas7d: z.number(),
    cambio7d: z.number().nullable(),
    ventas30d: z.number(),
    cambio30d: z.number().nullable(),
    unidadesStock: z.number(),
    valorInventario: z.number(),
    productos: z.number(),
  }),
  porAgotarse: z
    .array(z.object({ sku: z.string().max(40), producto: nombre, stock: z.number(), ventaDiaria: z.number(), diasParaAgotarse: z.number() }))
    .max(10),
  lentos: z
    .array(z.object({ sku: z.string().max(40), producto: nombre, stock: z.number(), diasSinVenta: z.number().nullable() }))
    .max(10),
  categorias: z.array(z.object({ categoria: nombre, ventas7d: z.number(), cambio7d: z.number().nullable() })).max(5),
  tendencias: z.array(z.object({ producto: nombre, cambio3Semanas: z.number() })).max(6),
});

export type SummaryInput = z.infer<typeof SummaryInputSchema>;

// ---- Promotion -------------------------------------------------------------

export const PROMO_TIPOS = ['descuento', '2x1', 'novedad', 'ultimas_piezas'] as const;
export const PROMO_FORMATOS = ['1:1', '9:16'] as const;

export type PromoTipo = (typeof PROMO_TIPOS)[number];
export type PromoFormato = (typeof PROMO_FORMATOS)[number];

export const PromoInputSchema = z.object({
  producto: nombre,
  categoria: z.string().max(40),
  precio: z.number().nonnegative(),
  tipo: z.enum(PROMO_TIPOS),
  descuento: z.number().int().min(5).max(90).nullable(),
  formato: z.enum(PROMO_FORMATOS),
});

export type PromoInput = z.infer<typeof PromoInputSchema>;

export const PromoSchema = z.object({
  titulo: z.string().max(40), // "-20%"
  subtitulo: z.string().max(60), // "en sudaderas"
  etiqueta: z.string().max(24), // "Solo esta semana"
  paleta: z.object({ fondo: z.string(), texto: z.string(), acento: z.string() }), // hex
  copy: z.string().max(400),
  hashtags: z.array(z.string()).max(6),
});

export type PromoContent = z.infer<typeof PromoSchema>;
