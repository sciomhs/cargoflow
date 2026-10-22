import { create } from 'zustand';

export const demoUsers = [
  { role: 'dispatcher', title: 'Диспетчер', userName: 'Айгерим Нурланова' },
  { role: 'driver', title: 'Водитель', userName: 'Руслан Касымов' },
  { role: 'client', title: 'Клиент', userName: 'ТОО «СтройКомплект»' },
  { role: 'manager', title: 'Руководитель', userName: 'Даурен Ахметов' },
] as const;

export type Role = (typeof demoUsers)[number]['role'];

// A signed-in server account; demo sessions leave it null and use the demo profile of the role.
export type Account = { id: string; role: Role; full_name: string; company_id: string | null };

type Session = {
  role: Role | null;
  userName: string;
  account: Account | null;
  signIn: (role: Role) => void;
  signInAccount: (account: Account) => void;
  signOut: () => void;
};

export const useSession = create<Session>((set) => ({
  role: null,
  userName: '',
  account: null,
  signIn: (role) => {
    const user = demoUsers.find((user) => user.role === role);
    if (!user) throw new Error('Неизвестная роль');
    set({ role: user.role, userName: user.userName, account: null });
  },
  signInAccount: (account) => set({ role: account.role, userName: account.full_name, account }),
  signOut: () => set({ role: null, userName: '', account: null }),
}));
