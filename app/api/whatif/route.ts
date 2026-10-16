import { callClaude } from '@/lib/ai/callClaude';
import { MODELO_WHATIF, SYSTEM_WHATIF, userWhatIf } from '@/lib/ai/prompts';
import { WhatIfAiSchema, WhatIfRequestSchema } from '@/lib/ai/schemas';

const MAX_BODY = 40_000; // bytes; ~7 candidates are ~8 KB

export async function POST(req: Request) {
  const texto = await req.text();
  if (texto.length > MAX_BODY) return Response.json({ error: 'Solicitud demasiado grande' }, { status: 413 });

  const body = WhatIfRequestSchema.safeParse(safeJson(texto));
  if (!body.success) return Response.json({ error: 'Datos inválidos' }, { status: 400 });

  const r = await callClaude({
    model: MODELO_WHATIF,
    system: SYSTEM_WHATIF,
    user: userWhatIf(body.data),
    schema: WhatIfAiSchema,
    maxTokens: 16_000,
    effort: 'low',
    fallback: false, // no server-side fallback for Haiku
  });
  if (!r.ok) return Response.json({ error: r.error }, { status: 502 });

  // Keep only scenarios that exist, once each: the cards take their numbers from them.
  const ids = new Set(body.data.candidatos.map((c) => c.id));
  const vistos = new Set<string>();
  const escenarios = r.value.escenarios.filter((e) => ids.has(e.id) && !vistos.has(e.id) && vistos.add(e.id));
  if (escenarios.length === 0) return Response.json({ error: 'La IA devolvió un formato inválido' }, { status: 502 });
  return Response.json({ escenarios });
}

const safeJson = (texto: string): unknown => {
  try {
    return JSON.parse(texto);
  } catch {
    return null;
  }
};
