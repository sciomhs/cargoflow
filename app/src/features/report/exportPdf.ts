import { printToFileAsync } from 'expo-print';
import { shareAsync, isAvailableAsync } from 'expo-sharing';

import type { TripDetail } from '@/domain/TripRepository';
import { File, Paths } from 'expo-file-system';

import { mediaFile } from '../media/photos';
import { tripReportHtml } from './tripReport';

export async function exportTripPdf(trip: TripDetail) {
  // Up to six photos from this device; photos taken elsewhere stay out of the offline report.
  const photos = [];
  for (const photo of trip.photos.slice(0, 6)) {
    const file = mediaFile(photo.storage_path);
    if (file.exists) photos.push({ stage: photo.stage, data: await file.base64() });
  }
  const { uri: printed } = await printToFileAsync({ html: tripReportHtml(trip, photos) });
  const named = new File(Paths.cache, `Акт-${trip.number}.pdf`);
  if (named.exists) named.delete();
  new File(printed).move(named);
  const uri = named.uri;
  if (await isAvailableAsync()) await shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: `Акт рейса ${trip.number}`, UTI: 'com.adobe.pdf' });
  return uri;
}
