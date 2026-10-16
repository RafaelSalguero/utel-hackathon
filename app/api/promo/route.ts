import { callClaude } from '@/lib/ai/callClaude';
import { MODELO_PROMO, SYSTEM_PROMO, userPromo } from '@/lib/ai/prompts';
import { PromoInputSchema, PromoSchema } from '@/lib/ai/schemas';

const MAX_BODY = 4_000; // bytes

export async function POST(req: Request) {
  const texto = await req.text();
  if (texto.length > MAX_BODY) return Response.json({ error: 'Solicitud demasiado grande' }, { status: 413 });

  const body = PromoInputSchema.safeParse(safeJson(texto));
  if (!body.success) return Response.json({ error: 'Datos inválidos' }, { status: 400 });

  const r = await callClaude({
    model: MODELO_PROMO,
    system: SYSTEM_PROMO,
    user: userPromo(body.data),
    schema: PromoSchema,
    maxTokens: 16_000,
    effort: 'medium',
    fallback: true,
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
