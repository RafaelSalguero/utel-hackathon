import QRCode from 'qrcode';
import { err, ok, type Result } from '@/lib/fp/result';
import { slugify } from './share';

// Mock product page: the CSV has no product URLs yet, so the QR points to a
// Tiendanube-style address built from the store and product names.
export const productUrl = (tienda: string, producto: string): string =>
  `https://${slugify(tienda) || 'mitienda'}.mitiendanube.com/productos/${slugify(producto) || 'producto'}`;

export const toQrDataUrl = async (url: string): Promise<Result<string>> => {
  try {
    return ok(await QRCode.toDataURL(url, { margin: 1, width: 360, errorCorrectionLevel: 'M' }));
  } catch {
    return err('No se pudo generar el código QR');
  }
};
