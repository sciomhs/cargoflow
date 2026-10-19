import { Redirect } from 'expo-router';

import { useSession } from '@/store/session';

const homeRoutes = {
  dispatcher: '/(dispatcher)/trips',
  driver: '/(driver)/today',
  client: '/(client)/deliveries',
  manager: '/(manager)/dashboard',
} as const;

export default function IndexScreen() {
  const role = useSession((state) => state.role);
  return <Redirect href={role ? homeRoutes[role] : '/(auth)/login'} />;
}
