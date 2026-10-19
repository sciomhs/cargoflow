import { create } from 'zustand';

type Settings = {
  demoMode: boolean;
  setDemoMode: (demoMode: boolean) => void;
};

export const useSettings = create<Settings>((set) => ({
  demoMode: true,
  setDemoMode: (demoMode) => set({ demoMode }),
}));
