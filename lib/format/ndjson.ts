// Splits a growing NDJSON buffer into complete lines and the unfinished rest.
export const splitLines = (buffer: string): { readonly lineas: readonly string[]; readonly resto: string } => {
  const partes = buffer.split('\n');
  return { lineas: partes.slice(0, -1).filter((l) => l.trim() !== ''), resto: partes[partes.length - 1] };
};
