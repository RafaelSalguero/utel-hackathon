import QRCode from 'qrcode';
import { err, ok, type Result } from '@/lib/fp/result';

// Accepts "mitienda.com" as well as full URLs.
export const normalizeUrl = (texto: string): string | null => {
  const limpio = texto.trim();
  if (limpio === '') return null;
  const conEsquema = /^https?:\/\//i.test(limpio) ? limpio : `https://${limpio}`;
  try {
    const url = new URL(conEsquema);
    return url.hostname.includes('.') ? url.toString() : null;
  } catch {
    return null;
  }
};

export const toQrDataUrl = async (url: string): Promise<Result<string>> => {
  try {
    return ok(await QRCode.toDataURL(url, { margin: 1, width: 360, errorCorrectionLevel: 'M' }));
  } catch {
    return err('No se pudo generar el código QR');
  }
};
