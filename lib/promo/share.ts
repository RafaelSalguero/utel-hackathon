export const downloadBlob = (blob: Blob, nombre: string): void => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export type ShareOutcome = 'compartido' | 'descargado' | 'cancelado';

// Web Share API with the file when supported; otherwise the image is downloaded.
export const sharePng = async (blob: Blob, nombre: string, texto: string): Promise<ShareOutcome> => {
  const file = new File([blob], nombre, { type: 'image/png' });
  const datos = { files: [file], text: texto };
  if (typeof navigator.canShare === 'function' && navigator.canShare(datos)) {
    try {
      await navigator.share(datos);
      return 'compartido';
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return 'cancelado';
    }
  }
  downloadBlob(blob, nombre);
  return 'descargado';
};

export const copyText = async (texto: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    return false;
  }
};

export const fileSlug = (texto: string): string =>
  texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 40) || 'promo';
