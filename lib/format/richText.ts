// A tiny, safe subset of Markdown for AI answers: paragraphs, "- " list items and
// **bold**. It produces data, not HTML, so nothing from the model is injected.

export type Segment = { readonly texto: string; readonly negrita: boolean };
export type Block = { readonly tipo: 'parrafo' | 'item'; readonly segmentos: readonly Segment[] };

export const parseInline = (linea: string): readonly Segment[] =>
  linea
    .split(/(\*\*[^*]+\*\*)/g)
    .filter((parte) => parte !== '')
    .map((parte) =>
      parte.startsWith('**') && parte.endsWith('**') && parte.length > 4
        ? { texto: parte.slice(2, -2), negrita: true }
        : { texto: parte, negrita: false },
    );

export const parseRichText = (texto: string): readonly Block[] =>
  texto
    .split('\n')
    .map((linea) => linea.trim())
    .filter((linea) => linea !== '')
    .map((linea) => {
      const item = /^([-*•]|\d+\.)\s+/.exec(linea);
      return item
        ? { tipo: 'item' as const, segmentos: parseInline(linea.slice(item[0].length)) }
        : { tipo: 'parrafo' as const, segmentos: parseInline(linea.replace(/^#+\s*/, '')) };
    });
