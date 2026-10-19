import type { Href } from 'expo-router';

import type { Role } from '../store/session';

export const homeRoutes = {
  dispatcher: '/(dispatcher)/(tabs)/trips',
  driver: '/(driver)/(tabs)/today',
  client: '/(client)/(tabs)/deliveries',
  manager: '/(manager)/dashboard',
} as const;

export function tripDestination(role: Role | null, id: string): Href {
  if (role === null) return { pathname: '/(auth)/login', params: { trip: id } };
  if (role === 'manager') return homeRoutes.manager;
  const paths = {
    dispatcher: '/(dispatcher)/trips/[id]',
    driver: '/(driver)/trips/[id]',
    client: '/(client)/deliveries/[id]',
  } as const;
  return { pathname: paths[role], params: { id } };
}
