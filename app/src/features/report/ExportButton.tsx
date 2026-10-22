import { useState } from 'react';
import { View } from 'react-native';

import type { TripDetail } from '@/domain/TripRepository';
import { FormError } from '@/components/form';
import { Button } from '@/ui';
import { spacing } from '@/ui/tokens';
import { exportTripPdf } from './exportPdf';

export function ExportButton({ trip }: { trip: TripDetail }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  return <View style={{ gap: spacing.sm }}>
    <Button variant="secondary" label={pending ? 'Готовим PDF…' : 'Акт рейса (PDF)'} disabled={pending} onPress={async () => {
      setPending(true);
      setError(undefined);
      try { await exportTripPdf(trip); } catch { setError('Не удалось сформировать PDF. Повторите.'); } finally { setPending(false); }
    }} />
    <FormError message={error} />
  </View>;
}
