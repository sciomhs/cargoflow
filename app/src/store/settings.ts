import { create } from 'zustand';
import type { DemoPreview } from '../demo/previewRepository';

type Settings = {
  demoMode: boolean;
  setDemoMode: (demoMode: boolean) => void;
  demoPreview: DemoPreview;
  setDemoPreview: (demoPreview: DemoPreview) => void;
};

export const useSettings = create<Settings>((set) => ({
  demoMode: true,
  setDemoMode: (demoMode) => set({ demoMode }),
  demoPreview: 'normal',
  setDemoPreview: (demoPreview) => set({ demoPreview }),
}));
