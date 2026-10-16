import { toBlob } from 'html-to-image';
import { err, ok, type Result } from '@/lib/fp/result';

// The template is drawn at full size and scaled down on screen with a transform;
// the export removes that transform so the PNG has the real size.
export const nodeToPng = async (node: HTMLElement, width: number, height: number): Promise<Result<Blob>> => {
  try {
    const blob = await toBlob(node, {
      width,
      height,
      pixelRatio: 1,
      cacheBust: true,
      style: { transform: 'none' },
    });
    return blob ? ok(blob) : err('No se pudo crear la imagen');
  } catch {
    return err('No se pudo crear la imagen');
  }
};
