import { betaZodTool } from '@anthropic-ai/sdk/helpers/beta/zod';
import { z } from 'zod';
import { streamAnswerWithTools } from '@/lib/ai/chat';
import { MODELO_CHAT, SYSTEM_CHAT } from '@/lib/ai/prompts';
import { ChatRequestSchema } from '@/lib/ai/schemas';
import { CRITERIOS, findProducts, pairsFor, rankProducts, riskProducts, storeOverview } from '@/lib/domain/insights';
import { simulate, type Escenario } from '@/lib/domain/whatif';

const MAX_BODY = 200_000; // bytes; ~40 KB for a store with 40 products

export async function POST(req: Request) {
  const texto = await req.text();
  if (texto.length > MAX_BODY) return Response.json({ error: 'Solicitud demasiado grande' }, { status: 413 });

  const body = ChatRequestSchema.safeParse(safeJson(texto));
  if (!body.success) return Response.json({ error: 'Datos inválidos' }, { status: 400 });
  const { dataset, mensajes } = body.data;
  if (mensajes[mensajes.length - 1].rol !== 'usuario') return Response.json({ error: 'Datos inválidos' }, { status: 400 });

  // The tools query the aggregated dataset sent with this request; the server stores nothing.
  const tools = [
    betaZodTool({
      name: 'resumen_tienda',
      description:
        'Panorama general de la tienda: ventas de 7 y 30 días con su cambio vs. el periodo anterior, unidades y valor del inventario, y cuántos productos están por agotarse, lentos o sanos.',
      inputSchema: z.object({}),
      run: async () => JSON.stringify(storeOverview(dataset)),
    }),
    betaZodTool({
      name: 'ranking_productos',
      description:
        'Ordena los productos por un criterio. Úsalo para "más vendido" (unidades30d o ingresos30d), "mejor ROI" (roi), "más ganancia" (ganancia30d), "mejor margen" (margen), "en tendencia" (tendencia3Semanas), "más stock" o "más dinero detenido en inventario" (valorInventario). Con orden "asc" obtienes los peores. Opcionalmente filtra por categoría.',
      inputSchema: z.object({
        criterio: z.enum(CRITERIOS),
        orden: z.enum(['desc', 'asc']).describe('desc = de mayor a menor'),
        limite: z.number().int().min(1).max(20).describe('Cuántos productos regresar'),
        categoria: z.string().nullable().describe('Nombre de categoría, por ejemplo "Ropa"; null para todas'),
      }),
      run: async (input) => JSON.stringify(rankProducts(dataset, input)),
    }),
    betaZodTool({
      name: 'detalle_producto',
      description:
        'Busca productos por nombre o SKU y devuelve todas sus métricas, incluido el stock y el estado de cada variante (talla, color).',
      inputSchema: z.object({ consulta: z.string().min(1).max(80).describe('Nombre o parte del nombre, o el SKU') }),
      run: async ({ consulta }) => {
        const encontrados = findProducts(dataset, consulta);
        return encontrados.length > 0 ? JSON.stringify(encontrados) : `No hay productos que coincidan con "${consulta}".`;
      },
    }),
    betaZodTool({
      name: 'productos_en_riesgo',
      description:
        'Productos que requieren atención: por_agotarse (ordenados por días para agotarse, con sus variantes críticas) y lentos (sin ventas en 30 días, ordenados por dinero detenido en inventario).',
      inputSchema: z.object({ tipo: z.enum(['por_agotarse', 'lento', 'todos']) }),
      run: async ({ tipo }) => JSON.stringify(riskProducts(dataset, tipo)),
    }),
    betaZodTool({
      name: 'estadisticas_categorias',
      description:
        'Métricas por categoría: ventas de 7 y 30 días con su cambio, ganancia de 30 días, valor del inventario y cuántos productos por agotarse o lentos tiene cada una.',
      inputSchema: z.object({}),
      run: async () => JSON.stringify(dataset.categorias),
    }),
    betaZodTool({
      name: 'simular_escenario',
      description:
        'Simula un "¿Y si…?" para un producto y proyecta 30 días antes y después: unidades, ingresos, ganancia, días para agotarse y ventas perdidas por falta de stock. tipo "precio" usa cambio_precio_pct (-15 = 15% de descuento, 10 = subir 10%); "reposicion" usa unidades a reponer; "demanda" usa aumento_demanda_pct (por ejemplo +30 por el Buen Fin). Llama una vez por opción si quieres comparar.',
      inputSchema: z.object({
        producto: z.string().min(1).max(80).describe('Nombre o SKU del producto'),
        tipo: z.enum(['precio', 'reposicion', 'demanda']),
        cambio_precio_pct: z.number().min(-70).max(100).nullable().describe('Solo para tipo "precio"'),
        unidades: z.number().int().min(1).max(10_000).nullable().describe('Solo para tipo "reposicion"'),
        aumento_demanda_pct: z.number().min(-90).max(300).nullable().describe('Solo para tipo "demanda"'),
      }),
      run: async (input) => {
        const producto = findProducts(dataset, input.producto)[0];
        if (!producto) return `No hay productos que coincidan con "${input.producto}".`;
        const escenario = toScenario(input);
        if (escenario === null) return `Falta el parámetro para el tipo "${input.tipo}".`;
        return JSON.stringify({ producto: producto.producto, sku: producto.sku, escenario, ...simulate(producto, escenario) });
      },
    }),
    betaZodTool({
      name: 'compras_juntas',
      description:
        'Pares de productos que se compran en los mismos pedidos más de lo esperado (lo que se compra junto), con pedidos en común, lift y confianza. Sin producto devuelve los pares principales; con producto, los pares donde aparece.',
      inputSchema: z.object({ producto: z.string().max(80).nullable().describe('Nombre o SKU; null para los principales') }),
      run: async ({ producto }) => {
        const pares = pairsFor(dataset, producto);
        return pares.length > 0 ? JSON.stringify(pares) : 'No hay pares con suficientes pedidos en común para ese producto.';
      },
    }),
    betaZodTool({
      name: 'fechas_clave',
      description:
        'Próximas fechas comerciales de México con los días que faltan, si el stock de los productos que encajan alcanza para la fecha (preparacion y cuántas piezas pedir) y qué stock lento conviene empujar en esa fecha.',
      inputSchema: z.object({}),
      run: async () => JSON.stringify(dataset.eventos),
    }),
  ];

  const stream = streamAnswerWithTools({ model: MODELO_CHAT, system: SYSTEM_CHAT, mensajes, tools, signal: req.signal });
  return new Response(stream, {
    headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-cache, no-transform' },
  });
}

const toScenario = (input: {
  readonly tipo: 'precio' | 'reposicion' | 'demanda';
  readonly cambio_precio_pct: number | null;
  readonly unidades: number | null;
  readonly aumento_demanda_pct: number | null;
}): Escenario | null => {
  if (input.tipo === 'precio') return input.cambio_precio_pct === null ? null : { tipo: 'precio', cambioPct: input.cambio_precio_pct };
  if (input.tipo === 'reposicion') return input.unidades === null ? null : { tipo: 'reposicion', unidades: input.unidades };
  return input.aumento_demanda_pct === null ? null : { tipo: 'demanda', aumentoPct: input.aumento_demanda_pct };
};

const safeJson = (texto: string): unknown => {
  try {
    return JSON.parse(texto);
  } catch {
    return null;
  }
};
