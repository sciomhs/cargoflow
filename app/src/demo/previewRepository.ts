import { RepositoryError, type TripRepository } from '../domain/TripRepository';

export type DemoPreview = 'normal' | 'loading' | 'empty' | 'error';

export function previewRepository(repo: TripRepository, state: DemoPreview): TripRepository {
  if (state === 'normal') return repo;
  if (state === 'loading') {
    const pending = () => new Promise<never>(() => {});
    return { listForDispatcher: pending, listForDriver: pending, get: pending };
  }
  if (state === 'empty') return {
    listForDispatcher: async () => [], listForDriver: async () => [],
    get: async () => { throw new RepositoryError('not_found'); },
  };
  const fail = async () => { throw new RepositoryError('unavailable'); };
  return { listForDispatcher: fail, listForDriver: fail, get: fail };
}
