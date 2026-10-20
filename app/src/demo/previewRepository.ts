import { RepositoryError, type TripRepository } from '../domain/TripRepository';

export type DemoPreview = 'normal' | 'loading' | 'empty' | 'error';

export function previewRepository(repo: TripRepository, state: DemoPreview): TripRepository {
  if (state === 'normal') return repo;
  if (state === 'loading') {
    const pending = () => new Promise<never>(() => {});
    return { listForDispatcher: pending, listForDriver: pending, get: pending, listOrders: pending,
      listNotifications: pending, markRead: pending, assignmentOptions: pending, nextNumber: pending, listProblems: pending, apply: pending };
  }
  const fail = async () => { throw new RepositoryError('unavailable'); };
  if (state === 'empty') return {
    listForDispatcher: async () => [], listForDriver: async () => [], listOrders: async () => [], listNotifications: async () => [],
    get: async () => { throw new RepositoryError('not_found'); }, markRead: async () => {},
    assignmentOptions: async () => ({ drivers: [], vehicles: [], clients: [] }), nextNumber: fail, listProblems: async () => [], apply: fail,
  };
  return { listForDispatcher: fail, listForDriver: fail, get: fail, listOrders: fail, listNotifications: fail,
    markRead: fail, assignmentOptions: fail, nextNumber: fail, listProblems: fail, apply: fail };
}
