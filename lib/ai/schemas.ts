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

// ---- Chat with the data ----------------------------------------------------

const estado = z.enum(['por_agotarse', 'lento', 'sano']);

export const ChatProductSchema = z.object({
  sku: z.string().max(120),
  producto: nombre,
  categoria: z.string().max(40),
  precio: z.number(),
  costo: z.number().nullable(),
  margen: z.number().nullable(), // (precio - costo) / precio
  roi: z.number().nullable(), // (precio - costo) / costo
  stock: z.number(),
  valorInventario: z.number(),
  unidades7d: z.number(),
  unidades30d: z.number(),
  ingresos30d: z.number(),
  ganancia30d: z.number().nullable(),
  tendencia3Semanas: z.number().nullable(),
  estado,
  diasParaAgotarse: z.number().nullable(),
  diasSinVenta: z.number().nullable(),
  ventaDiaria: z.number(), // units per day, last 28 days
  ventaDiaria8Semanas: z.number(), // units per day over 8 weeks (pace of slow products before they stopped)
  elasticidad: z.number(), // a d% price change moves sales by about -elasticidad*d%
  elasticidadFuente: z.enum(['producto', 'tienda', 'supuesto']),
  variantes: z
    .array(z.object({ variante: z.string().max(40), stock: z.number(), unidades30d: z.number(), estado, diasParaAgotarse: z.number().nullable() }))
    .max(50),
});

export type ChatProduct = z.infer<typeof ChatProductSchema>;

const ladoPareja = z.object({ sku: z.string().max(120), producto: nombre, estado });

export const ChatPairSchema = z.object({
  a: ladoPareja,
  b: ladoPareja,
  pedidos: z.number(),
  lift: z.number(),
  confianzaAB: z.number(),
  confianzaBA: z.number(),
  oportunidad: z.enum(['liquidar_en_kit', 'riesgo_doble', 'kit']),
});

export const RetailEventPlanSchema = z.object({
  id: z.string().max(40),
  nombre: z.string().max(40),
  fecha: z.string(),
  diasRestantes: z.number(),
  duracion: z.number(),
  aproximada: z.boolean(),
  clave: z
    .array(
      z.object({
        sku: z.string().max(120),
        producto: nombre,
        stock: z.number(),
        ventaDiaria: z.number(),
        diasParaAgotarse: z.number().nullable(),
        preparacion: z.enum(['se_agota_antes', 'se_agota_durante', 'listo']),
        pedirMas: z.number(),
      }),
    )
    .max(5),
  oportunidades: z.array(z.object({ sku: z.string().max(120), producto: nombre, stock: z.number() })).max(5),
});

export const ChatDatasetSchema = z.object({
  fechaCorte: z.string().nullable(),
  kpis: SummaryInputSchema.shape.kpis,
  elasticidadTienda: z.number(),
  compras: z.array(ChatPairSchema).max(40),
  eventos: z.array(RetailEventPlanSchema).max(5),
  productos: z.array(ChatProductSchema).max(500),
  categorias: z
    .array(
      z.object({
        categoria: z.string().max(40),
        productos: z.number(),
        ventas7d: z.number(),
        cambio7d: z.number().nullable(),
        ventas30d: z.number(),
        cambio30d: z.number().nullable(),
        ganancia30d: z.number().nullable(),
        valorInventario: z.number(),
        porAgotarse: z.number(),
        lentos: z.number(),
      }),
    )
    .max(20),
});

export type ChatDataset = z.infer<typeof ChatDatasetSchema>;

export const ChatMessageSchema = z.object({
  rol: z.enum(['usuario', 'asistente']),
  texto: z.string().min(1).max(4000),
});

export type ChatMessage = z.infer<typeof ChatMessageSchema>;

export const ChatRequestSchema = z.object({
  dataset: ChatDatasetSchema,
  mensajes: z.array(ChatMessageSchema).min(1).max(20),
});

export type ChatRequest = z.infer<typeof ChatRequestSchema>;

// /api/chat streams one JSON event per line (NDJSON).
export const ChatEventSchema = z.discriminatedUnion('t', [
  z.object({ t: z.literal('texto'), texto: z.string() }),
  z.object({ t: z.literal('herramienta'), nombre: z.string() }),
  z.object({ t: z.literal('error'), error: z.string() }),
  z.object({ t: z.literal('fin') }),
]);

export type ChatEvent = z.infer<typeof ChatEventSchema>;

// ---- "¿Y si…?" ---------------------------------------------------------------

const resultado30d = z.object({
  precio: z.number(),
  ritmoDiario: z.number(),
  unidades: z.number(),
  ingresos: z.number(),
  ganancia: z.number().nullable(),
  diasParaAgotarse: z.number().nullable(),
  ventasPerdidas: z.number(),
});

export const WhatIfCandidateSchema = z.object({
  id: z.string().max(40),
  pregunta: z.string().max(160),
  sku: z.string().max(120),
  producto: nombre,
  escenario: z.discriminatedUnion('tipo', [
    z.object({ tipo: z.literal('precio'), cambioPct: z.number() }),
    z.object({ tipo: z.literal('reposicion'), unidades: z.number() }),
    z.object({ tipo: z.literal('demanda'), aumentoPct: z.number() }),
  ]),
  proyeccion: z.object({ antes: resultado30d, despues: resultado30d, supuestos: z.array(z.string().max(300)).max(5) }),
});

export const WhatIfRequestSchema = z.object({
  fechaCorte: z.string().nullable(),
  candidatos: z.array(WhatIfCandidateSchema).min(1).max(10),
});

export type WhatIfRequest = z.infer<typeof WhatIfRequestSchema>;

// The AI picks and explains; every number on the card comes from the candidate.
export const WhatIfAiSchema = z.object({
  escenarios: z
    .array(
      z.object({
        id: z.string(),
        titulo: z.string().max(80), // the question, e.g. "¿Y si subo 10% la Chamarra acolchada?"
        explicacion: z.string().max(240),
        veredicto: z.enum(['conviene', 'no_conviene', 'depende']),
      }),
    )
    .min(1)
    .max(5),
});

export type WhatIfAi = z.infer<typeof WhatIfAiSchema>;

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
