import { CommandError, type Command } from '../domain/commands';
import { deviceStorage, type KeyValue } from '../demo/persist';

export type QueuedAction = { command: Command; status: 'pending' | 'failed'; attempts: number; error?: string };
export const OUTBOX_KEY = 'cargoflow.outbox.v1';
export const OFFLINE_KINDS: readonly Command['kind'][] = ['transition', 'add_photo', 'add_document', 'hand_over', 'report_problem'];
export const MAX_ATTEMPTS = 5;

// Driver actions waiting for the network. Stored on the device, sent strictly in order, each with its own action id.
export class Outbox {
  private listeners = new Set<() => void>();
  private flushing: Promise<void> | null = null;

  constructor(private storage: KeyValue = deviceStorage()) {}

  items(): QueuedAction[] {
    try {
      return JSON.parse(this.storage.get(OUTBOX_KEY) ?? '[]') as QueuedAction[];
    } catch {
      return [];
    }
  }

  private save(items: QueuedAction[]) {
    if (items.length) this.storage.set(OUTBOX_KEY, JSON.stringify(items));
    else this.storage.remove(OUTBOX_KEY);
    for (const listener of this.listeners) listener();
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  enqueue(command: Command) {
    const items = this.items();
    if (!items.some((item) => item.command.action_id === command.action_id)) this.save([...items, { command, status: 'pending', attempts: 0 }]);
  }

  retry(actionId: string) {
    this.save(this.items().map((item) => item.command.action_id === actionId ? { ...item, status: 'pending', attempts: 0, error: undefined } : item));
  }

  discard(actionId: string) {
    this.save(this.items().filter((item) => item.command.action_id !== actionId));
  }

  // Sends from the head of the queue. A network error stops the pass and keeps the action;
  // a server rejection marks it failed and blocks the actions behind it until the driver decides.
  flush(send: (command: Command) => Promise<void>) {
    if (!this.flushing) this.flushing = this.run(send).finally(() => { this.flushing = null; });
    return this.flushing;
  }

  private async run(send: (command: Command) => Promise<void>) {
    for (;;) {
      const [head] = this.items();
      if (!head || head.status === 'failed') return;
      try {
        await send(head.command);
        this.save(this.items().filter((item) => item.command.action_id !== head.command.action_id));
      } catch (error) {
        const rejected = error instanceof CommandError;
        const attempts = head.attempts + 1;
        this.save(this.items().map((item) => item.command.action_id === head.command.action_id
          ? { ...item, attempts, status: rejected || attempts >= MAX_ATTEMPTS ? 'failed' : 'pending',
            error: rejected ? (error as Error).message : attempts >= MAX_ATTEMPTS ? 'Не удалось отправить. Проверьте сеть и повторите' : undefined }
          : item));
        return;
      }
    }
  }
}

let shared: Outbox | undefined;
export function outbox() {
  if (!shared) shared = new Outbox();
  return shared;
}
