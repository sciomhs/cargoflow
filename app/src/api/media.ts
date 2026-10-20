import { mediaFile } from '@/features/media/photos';

export async function readMedia(storagePath: string): Promise<Uint8Array | null> {
  const file = mediaFile(storagePath);
  return file.exists ? file.bytes() : null;
}
