import { useLocalSearchParams } from 'expo-router';

import NavigationLinks from '@/components/navigation-links';

export default function DriverTripScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <NavigationLinks links={[
      { label: 'Фото рейса', href: { pathname: '/(driver)/trips/[id]/photo', params: { id } } },
      { label: 'Документы', href: { pathname: '/(driver)/trips/[id]/docs', params: { id } } },
      { label: 'Сообщить о проблеме', href: { pathname: '/(driver)/trips/[id]/problem', params: { id } } },
      { label: 'Передача груза', href: { pathname: '/(driver)/trips/[id]/handover', params: { id } } },
    ]} />
  );
}
