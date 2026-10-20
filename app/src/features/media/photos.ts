import { randomUUID } from 'expo-crypto';
import { Directory, File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';

export type Folder = 'before_load' | 'after_load' | 'at_delivery' | 'problem' | 'documents';
export type Picked = { id: string; storage_path: string; taken_at: string; uri: string };
export type PickResult = { photo: Picked } | { error: string } | { cancelled: true };

// Photos live in the app's documents folder under the same path the server bucket uses.
export function mediaFile(storagePath: string) {
  return new File(Paths.document, 'trip-media', ...storagePath.split('/'));
}

export function mediaUri(storagePath: string): string | null {
  try {
    const file = mediaFile(storagePath);
    return file.exists ? file.uri : null;
  } catch {
    return null;
  }
}

export async function pickPhoto(tripId: string, folder: Folder, source: 'camera' | 'library'): Promise<PickResult> {
  // The system photo picker needs no library permission; only the camera asks.
  if (source === 'camera' && !(await ImagePicker.requestCameraPermissionsAsync()).granted) {
    return { error: 'Нет доступа к камере. Разрешите его в настройках телефона.' };
  }
  let result: ImagePicker.ImagePickerResult;
  try {
    const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.5 };
    result = source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
  } catch {
    return { error: source === 'camera' ? 'Камера недоступна. Выберите фото из галереи.' : 'Не удалось открыть галерею.' };
  }
  if (result.canceled || !result.assets[0]) return { cancelled: true };
  const id = randomUUID();
  const storage_path = `${tripId}/${folder}/${id}.jpg`;
  try {
    const directory = new Directory(Paths.document, 'trip-media', tripId, folder);
    directory.create({ intermediates: true, idempotent: true });
    const target = mediaFile(storage_path);
    await new File(result.assets[0].uri).copy(target);
    return { photo: { id, storage_path, taken_at: new Date().toISOString(), uri: target.uri } };
  } catch {
    return { error: 'Не удалось сохранить фото на устройстве. Освободите место и повторите.' };
  }
}
