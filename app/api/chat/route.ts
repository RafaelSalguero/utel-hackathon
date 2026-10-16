import { betaZodTool } from '@anthropic-ai/sdk/helpers/beta/zod';
import { z } from 'zod';
import { streamAnswerWithTools } from '@/lib/ai/chat';
import { MODELO_CHAT, SYSTEM_CHAT } from '@/lib/ai/prompts';
import { ChatRequestSchema } from '@/lib/ai/schemas';
import { CRITERIOS, findProducts, rankProducts, riskProducts, storeOverview } from '@/lib/domain/insights';

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
  ];

  const stream = streamAnswerWithTools({ model: MODELO_CHAT, system: SYSTEM_CHAT, mensajes, tools, signal: req.signal });
  return new Response(stream, {
    headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-cache, no-transform' },
  });
}

const safeJson = (texto: string): unknown => {
  try {
    return JSON.parse(texto);
  } catch {
    return null;
  }
};
