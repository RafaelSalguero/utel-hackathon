import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import type { z } from 'zod';
import { err, ok, type Result } from '@/lib/fp/result';
import { anthropic } from './client';

type Effort = 'low' | 'medium' | 'high';

// Calls Claude with structured outputs: the API constrains the reply to the schema
// and the SDK parses and validates it with zod.
export const callClaude = async <S extends z.ZodType>(opts: {
  readonly model: string;
  readonly system: string;
  readonly user: string;
  readonly schema: S;
  readonly maxTokens: number;
  readonly effort: Effort;
  readonly fallback: boolean; // server-side refusal fallback (not available on Haiku)
}): Promise<Result<z.infer<S>>> => {
  try {
    const res = await anthropic.beta.messages.parse({
      model: opts.model,
      max_tokens: opts.maxTokens,
      system: opts.system,
      messages: [{ role: 'user', content: opts.user }],
      output_config: { effort: opts.effort, format: betaZodOutputFormat(opts.schema) },
      ...(opts.fallback ? { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const } : {}),
    });
    if (res.stop_reason === 'refusal') return err('La IA no pudo responder a esta solicitud');
    if (res.stop_reason === 'max_tokens') return err('La respuesta de la IA quedó incompleta');
    return res.parsed_output == null ? err('La IA devolvió un formato inválido') : ok(res.parsed_output);
  } catch (e) {
    console.error('[callClaude]', e instanceof Error ? e.message : e);
    return err('No se pudo contactar a la IA');
  }
};
