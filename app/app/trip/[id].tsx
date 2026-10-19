import { Redirect, useLocalSearchParams } from 'expo-router';

import { tripDestination } from '@/navigation/routes';
import { useSession } from '@/store/session';

export default function TripLink() {
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const role = useSession((state) => state.role);
  if (typeof id !== 'string' || !id.trim()) return <Redirect href="/" />;
  return <Redirect href={tripDestination(role, id)} withAnchor />;
}
