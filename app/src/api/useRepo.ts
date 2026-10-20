import { randomUUID } from 'expo-crypto';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { Command, CommandBody } from '@/domain/commands';
import { RepositoryError, type TripRepository } from '@/domain/TripRepository';
import { demoStore } from '@/demo/store';
import { useSession } from '@/store/session';
import { useSettings } from '@/store/settings';
import { tripRepository } from './repository';

export function useRepository() {
  const role = useSession((state) => state.role);
  const demoMode = useSettings((state) => state.demoMode);
  const preview = useSettings((state) => state.demoPreview);
  return useCallback(() => {
    if (!role) return Promise.reject(new Error('Войдите снова'));
    return tripRepository(demoMode, role, preview);
  }, [role, demoMode, preview]);
}

type Loaded<T> = { data?: T; error?: string; notFound?: boolean };

// Loads on mount, on screen focus and after any demo change, so every role sees fresh results.
export function useLoad<T>(load: (repo: TripRepository) => Promise<T>, key: string) {
  const getRepo = useRepository();
  const [state, setState] = useState<Loaded<T> & { key?: string }>({});
  const [version, setVersion] = useState(0);
  const loadRef = useRef(load);
  useEffect(() => { loadRef.current = load; });
  useEffect(() => demoStore().subscribe(() => setVersion((value) => value + 1)), []);
  useFocusEffect(useCallback(() => { setVersion((value) => value + 1); }, []));
  useEffect(() => {
    let active = true;
    getRepo().then((repo) => loadRef.current(repo))
      .then((data) => { if (active) setState({ key, data }); })
      .catch((error: Error) => { if (active) setState({ key, error: error.message,
        notFound: error instanceof RepositoryError && error.code === 'not_found' }); });
    return () => { active = false; };
  }, [getRepo, key, version]);
  const current: Loaded<T> = state.key === key ? state : {};
  return { ...current, retry: () => setVersion((value) => value + 1) };
}

// One submission = one action id, reused on retry so a repeated request cannot create a duplicate.
export function useAction() {
  const getRepo = useRepository();
  const demoMode = useSettings((state) => state.demoMode);
  const busy = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const run = useCallback(async (body: CommandBody, actionId: string = randomUUID()) => {
    if (busy.current) return false;
    busy.current = true;
    setPending(true);
    setError(undefined);
    try {
      const repo = await getRepo();
      const at = demoMode ? demoStore().nextAt() : new Date().toISOString();
      await repo.apply({ ...body, action_id: actionId, at } as Command);
      return true;
    } catch (failure) {
      setError((failure as Error).message);
      return false;
    } finally {
      busy.current = false;
      setPending(false);
    }
  }, [getRepo, demoMode]);
  return { run, pending, error, setError };
}

export function useActionId() {
  return useState(() => randomUUID())[0];
}
