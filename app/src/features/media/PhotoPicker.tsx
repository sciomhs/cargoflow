import { useState } from 'react';
import { Image, View } from 'react-native';

import { Button, Text } from '@/ui';
import { useTheme } from '@/ui/theme';
import { radius, spacing } from '@/ui/tokens';
import { pickPhoto, type Folder, type Picked } from './photos';

export function PhotoPicker({ tripId, folder, value, onChange, label = 'Фото' }: {
  tripId: string; folder: Folder; value: Picked | null; onChange: (photo: Picked | null) => void; label?: string;
}) {
  const [error, setError] = useState<string>();
  const pick = async (source: 'camera' | 'library') => {
    setError(undefined);
    const result = await pickPhoto(tripId, folder, source);
    if ('photo' in result) onChange(result.photo);
    if ('error' in result) setError(result.error);
  };
  return <View style={{ gap: spacing.md }}>
    <Text size="small">{label}</Text>
    {value && <Image source={{ uri: value.uri }} accessibilityLabel={`${label}: выбрано`}
      style={{ width: '100%', height: 200, borderRadius: radius }} resizeMode="cover" />}
    <View style={{ flexDirection: 'row', gap: spacing.md }}>
      <View style={{ flex: 1 }}><Button variant="secondary" label={value ? 'Переснять' : 'Сделать фото'} onPress={() => pick('camera')} /></View>
      <View style={{ flex: 1 }}><Button variant="secondary" label="Из галереи" onPress={() => pick('library')} /></View>
    </View>
    {error && <Text size="small" tone="delay" accessibilityRole="alert">{error}</Text>}
  </View>;
}

export function Thumbnails({ uris }: { uris: { id: string; uri: string | null; label: string }[] }) {
  const { colors } = useTheme();
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
    {uris.map((item) => item.uri
      ? <Image key={item.id} source={{ uri: item.uri }} accessibilityLabel={item.label} style={{ width: 96, height: 96, borderRadius: radius }} />
      : <View key={item.id} accessible accessibilityLabel={`${item.label}: файл на другом устройстве`}
        style={{ width: 96, height: 96, borderRadius: radius, borderWidth: 1, borderColor: colors.border, justifyContent: 'center', padding: spacing.sm }}>
        <Text size="caption" tone="muted">{item.label}</Text>
      </View>)}
  </View>;
}
