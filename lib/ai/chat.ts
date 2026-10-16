import type { BetaRunnableTool } from '@anthropic-ai/sdk/lib/tools/BetaRunnableTool';
import type { ChatEvent, ChatMessage } from './schemas';
import { anthropic } from './client';

const MAX_RONDAS = 6; // tool-call rounds per question

// Runs the tool loop with the SDK's streaming tool runner and returns an NDJSON
// stream of ChatEvents: text as it is generated, the tools being used, and the end.
// Tool inputs are a few small fields, so eager input streaming stays off: the API
// keeps validating tool JSON and no retry for unparseable input is needed.
export const streamAnswerWithTools = (opts: {
  readonly model: string;
  readonly system: string;
  readonly mensajes: readonly ChatMessage[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- each tool has its own input type
  readonly tools: BetaRunnableTool<any>[];
  readonly signal: AbortSignal;
}): ReadableStream<Uint8Array> => {
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      // The client may disconnect mid-answer; writing then throws, and there is no one to tell.
      const send = (evento: ChatEvent) => {
        try {
          controller.enqueue(encoder.encode(`${JSON.stringify(evento)}\n`));
        } catch {
          // stream already closed
        }
      };
      const fail = (error: string) => {
        send({ t: 'error', error });
        controller.close();
      };

      try {
        const runner = anthropic.beta.messages.toolRunner(
          {
            model: opts.model,
            max_tokens: 16_000,
            max_iterations: MAX_RONDAS,
            system: opts.system,
            messages: opts.mensajes.map((m) => ({ role: m.rol === 'usuario' ? 'user' : 'assistant', content: m.texto })),
            tools: opts.tools,
            output_config: { effort: 'low' },
            betas: ['server-side-fallback-2026-07-01'],
            fallbacks: 'default',
            stream: true,
          },
          { signal: opts.signal },
        );

        let huboTexto = false;
        for await (const turno of runner) {
          let textoEnTurno = false;
          for await (const evento of turno) {
            if (evento.type === 'content_block_start' && evento.content_block.type === 'tool_use') {
              send({ t: 'herramienta', nombre: evento.content_block.name });
            }
            if (evento.type === 'content_block_delta' && evento.delta.type === 'text_delta') {
              // Text from an earlier turn (before a tool call) starts a new paragraph.
              const separador = huboTexto && !textoEnTurno ? '\n\n' : '';
              textoEnTurno = true;
              huboTexto = true;
              send({ t: 'texto', texto: separador + evento.delta.text });
            }
          }
          const mensaje = await turno.finalMessage();
          if (mensaje.stop_reason === 'refusal') return fail('La IA no pudo responder a esta pregunta');
          // A truncated tool call could still pass validation; never run it.
          if (mensaje.stop_reason === 'max_tokens' && mensaje.content.some((b) => b.type === 'tool_use')) {
            return fail('La respuesta de la IA quedó incompleta');
          }
        }

        if (!huboTexto) return fail('La IA no devolvió una respuesta');
        send({ t: 'fin' });
        controller.close();
      } catch (e) {
        if (opts.signal.aborted) return controller.close();
        console.error('[streamAnswerWithTools]', e instanceof Error ? e.message : e);
        fail('No se pudo contactar a la IA');
      }
    },
  });
};
