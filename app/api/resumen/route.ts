import { callClaude } from '@/lib/ai/callClaude';
import { MODELO_RESUMEN, SYSTEM_RESUMEN, userResumen } from '@/lib/ai/prompts';
import { AiSummarySchema, SummaryInputSchema } from '@/lib/ai/schemas';

const MAX_BODY = 32_000; // bytes; the aggregated summary is a few KB

export async function POST(req: Request) {
  const texto = await req.text();
  if (texto.length > MAX_BODY) return Response.json({ error: 'Solicitud demasiado grande' }, { status: 413 });

  const body = SummaryInputSchema.safeParse(safeJson(texto));
  if (!body.success) return Response.json({ error: 'Datos inválidos' }, { status: 400 });

  const r = await callClaude({
    model: MODELO_RESUMEN,
    system: SYSTEM_RESUMEN,
    user: userResumen(body.data),
    schema: AiSummarySchema,
    maxTokens: 16_000,
    effort: 'low',
    fallback: false, // no server-side fallback for Haiku
  });

  return r.ok ? Response.json(r.value) : Response.json({ error: r.error }, { status: 502 });
}

const safeJson = (texto: string): unknown => {
  try {
    return JSON.parse(texto);
  } catch {
    return null;
  }
};
