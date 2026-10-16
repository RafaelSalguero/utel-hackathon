import type { BetaRunnableTool } from '@anthropic-ai/sdk/lib/tools/BetaRunnableTool';
import { err, ok, type Result } from '@/lib/fp/result';
import type { ChatMessage } from './schemas';
import { anthropic } from './client';

const MAX_RONDAS = 6; // tool-call rounds per question

// Runs the tool loop with the SDK's tool runner and returns the final text answer.
export const answerWithTools = async (opts: {
  readonly model: string;
  readonly system: string;
  readonly mensajes: readonly ChatMessage[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- each tool has its own input type
  readonly tools: BetaRunnableTool<any>[];
}): Promise<Result<string>> => {
  try {
    const final = await anthropic.beta.messages.toolRunner({
      model: opts.model,
      max_tokens: 16_000,
      max_iterations: MAX_RONDAS,
      system: opts.system,
      messages: opts.mensajes.map((m) => ({ role: m.rol === 'usuario' ? 'user' : 'assistant', content: m.texto })),
      tools: opts.tools,
      output_config: { effort: 'low' },
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
    });
    if (final.stop_reason === 'refusal') return err('La IA no pudo responder a esta pregunta');
    const texto = final.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('').trim();
    if (texto === '') return err('La IA no devolvió una respuesta');
    return ok(texto);
  } catch (e) {
    console.error('[answerWithTools]', e instanceof Error ? e.message : e);
    return err('No se pudo contactar a la IA');
  }
};
