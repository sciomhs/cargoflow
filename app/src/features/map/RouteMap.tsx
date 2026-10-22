import { Truck, Warehouse, MapPin } from 'lucide-react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { View } from 'react-native';

import type { TripStatus } from '@/domain/statusMachine';
import { Text } from '@/ui';
import { useTheme } from '@/ui/theme';
import { cardRadius, spacing } from '@/ui/tokens';
import { between, cityPoint, stageProgress } from './cities';

function Pin({ Icon }: { Icon: typeof Truck }) {
  const { colors } = useTheme();
  return <View style={{ alignItems: 'center' }}>
    <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center',
      borderWidth: 3, borderColor: '#FFFFFF' }}>
      <Icon size={20} color="#FFFFFF" strokeWidth={2} />
    </View>
    <View style={{ width: 3, height: 8, backgroundColor: colors.accent }} />
  </View>;
}

export function RouteMap({ from, to, status, height = 220 }: { from: string; to: string; status: TripStatus; height?: number }) {
  const { colors } = useTheme();
  const a = cityPoint(from);
  const b = cityPoint(to);
  if (!a || !b) return <View style={{ height: 80, borderRadius: cardRadius, backgroundColor: colors.tint, justifyContent: 'center', padding: spacing.lg }}>
    <Text tone="muted">{from} → {to}: карта для этих городов недоступна</Text>
  </View>;
  const truck = between(a, b, stageProgress(status));
  const moving = !['assigned', 'accepted', 'to_pickup', 'at_pickup', 'loading', 'cancelled'].includes(status);
  const region = { latitude: (a.latitude + b.latitude) / 2, longitude: (a.longitude + b.longitude) / 2,
    latitudeDelta: Math.abs(a.latitude - b.latitude) * 1.8 + 0.6, longitudeDelta: Math.abs(a.longitude - b.longitude) * 1.6 + 0.6 };
  return <View accessible accessibilityLabel={`Маршрут ${from} → ${to}`} style={{ height, borderRadius: cardRadius, overflow: 'hidden' }}>
    <MapView style={{ flex: 1 }} initialRegion={region} scrollEnabled={false} zoomEnabled={false} rotateEnabled={false} pitchEnabled={false}
      toolbarEnabled={false} showsPointsOfInterests={false}>
      <Polyline coordinates={[a, truck, b]} strokeColor={colors.accent} strokeWidth={4} />
      <Marker coordinate={a} anchor={{ x: 0.5, y: 1 }} title={from} description="Загрузка"><Pin Icon={Warehouse} /></Marker>
      <Marker coordinate={b} anchor={{ x: 0.5, y: 1 }} title={to} description="Доставка"><Pin Icon={MapPin} /></Marker>
      {moving && status !== 'completed' && <Marker coordinate={truck} anchor={{ x: 0.5, y: 1 }} title="Груз" description="Положение по этапу рейса"><Pin Icon={Truck} /></Marker>}
    </MapView>
  </View>;
}
