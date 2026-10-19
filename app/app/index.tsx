import { Redirect } from 'expo-router';

import { useSession } from '@/store/session';
import { homeRoutes } from '@/navigation/routes';

export default function IndexScreen() {
  const role = useSession((state) => state.role);
  return <Redirect href={role ? homeRoutes[role] : '/(auth)/login'} />;
}
