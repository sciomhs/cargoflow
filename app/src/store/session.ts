import { create } from 'zustand';

export const demoUsers = [
  { role: 'dispatcher', title: 'Диспетчер', userName: 'Айгерим Нурланова' },
  { role: 'driver', title: 'Водитель', userName: 'Руслан Касымов' },
  { role: 'client', title: 'Клиент', userName: 'ТОО «СтройКомплект»' },
  { role: 'manager', title: 'Руководитель', userName: 'Даурен Ахметов' },
] as const;

export type Role = (typeof demoUsers)[number]['role'];

type Session = {
  role: Role | null;
  userName: string;
  signIn: (role: Role) => void;
  signOut: () => void;
};

export const useSession = create<Session>((set) => ({
  role: null,
  userName: '',
  signIn: (role) => {
    const user = demoUsers.find((user) => user.role === role);
    if (!user) throw new Error('Неизвестная роль');
    set({ role: user.role, userName: user.userName });
  },
  signOut: () => set({ role: null, userName: '' }),
}));
