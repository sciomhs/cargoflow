export const palettes = {
  light: {
    background: '#F5F4FA', surface: '#FFFFFF', text: '#1C1A29', muted: '#5F5B72',
    border: '#E4E1EF', pressed: '#EEEBFA', accent: '#5B3FE0', accentText: '#5B3FE0',
    onAccent: '#FFFFFF', destructive: '#C2391E', onDestructive: '#FFFFFF',
    delay: '#C2391E', waiting: '#8A6A12', completed: '#2F8A5B', tint: '#EEEAFE',
  },
  dark: {
    background: '#14121C', surface: '#1F1C2B', text: '#F4F2FA', muted: '#B4AFC6',
    border: '#3A3550', pressed: '#2A2638', accent: '#5B3FE0', accentText: '#B9AAFF',
    onAccent: '#FFFFFF', destructive: '#C2391E', onDestructive: '#FFFFFF',
    delay: '#F0957C', waiting: '#D9B65A', completed: '#7FCFA2', tint: '#2B2550',
  },
} as const;

export type Mode = keyof typeof palettes;
export type Colors = { [Key in keyof typeof palettes.light]: string };

export const fonts = {
  sans: 'IBMPlexSans_400Regular', medium: 'IBMPlexSans_500Medium', mono: 'IBMPlexMono_400Regular',
} as const;

export const typeScale = {
  caption: { fontSize: 12, lineHeight: 16 },
  small: { fontSize: 14, lineHeight: 20 },
  body: { fontSize: 16, lineHeight: 24 },
  title: { fontSize: 20, lineHeight: 28 },
  display: { fontSize: 28, lineHeight: 36 },
} as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = 12;
export const cardRadius = 16;
export const touch = { normal: 48, driver: 56, driverAction: 64 } as const;
export const icon = { size: 20, strokeWidth: 1.75 } as const;

export function themeMode(isDriver: boolean, scheme: string | null | undefined): Mode {
  return isDriver && scheme === 'dark' ? 'dark' : 'light';
}

export function themeVariables(mode: Mode) {
  return Object.fromEntries(Object.entries(palettes[mode]).map(([key, value]) => [`--color-${key}`, value]));
}
