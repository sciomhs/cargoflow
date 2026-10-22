import { randomUUID } from 'expo-crypto';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { Command, CommandBody } from '@/domain/commands';
import { RepositoryError, type TripRepository } from '@/domain/TripRepository';
import { demoUser } from '@/demo/data';
import { demoStore } from '@/demo/store';
import { OFFLINE_KINDS, outbox } from '@/outbox/queue';
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
  useEffect(() => outbox().subscribe(() => setVersion((value) => value + 1)), []);
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
// In server mode a driver action that hits a network error waits in the device outbox instead of failing.
export function useAction() {
  const getRepo = useRepository();
  const demoMode = useSettings((state) => state.demoMode);
  const busy = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const run = useCallback(async (body: CommandBody, actionId: string = randomUUID()) => {
    if (busy.current) return false;
    busy.current = true;
    setPending(true);
    setError(undefined);
    setNotice(undefined);
    const at = demoMode ? demoStore().nextAt() : new Date().toISOString();
    const command = { ...body, action_id: actionId, at } as Command;
    const queueable = !demoMode && OFFLINE_KINDS.includes(command.kind);
    try {
      const repo = await getRepo();
      if (queueable && outbox().items().length) {
        // Keep order: while earlier actions wait, new ones queue behind them.
        outbox().enqueue(command);
        setNotice('Действие сохранено и отправится после предыдущих');
        void outbox().flush((queued) => repo.apply(queued));
        return true;
      }
      await repo.apply(command);
      return true;
    } catch (failure) {
      if (queueable && failure instanceof RepositoryError && failure.code === 'unavailable') {
        outbox().enqueue(command);
        setNotice('Нет сети. Действие сохранено и отправится автоматически');
        return true;
      }
      setError((failure as Error).message);
      return false;
    } finally {
      busy.current = false;
      setPending(false);
    }
  }, [getRepo, demoMode]);
  return { run, pending, error, setError, notice };
}

export function useActionId() {
  return useState(() => randomUUID())[0];
}

export function useUser() {
  const role = useSession((state) => state.role);
  const account = useSession((state) => state.account);
  return account ?? (role ? demoUser(role) : null);
}
