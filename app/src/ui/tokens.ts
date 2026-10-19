export const palettes = {
  light: {
    background: '#F4F2EE', surface: '#FFFFFF', text: '#1A1917', muted: '#5E5A54',
    border: '#DCD8D0', pressed: '#E9E5DD', accent: '#1F6F4A', accentText: '#1F6F4A',
    onAccent: '#FFFFFF', destructive: '#B4411F', onDestructive: '#FFFFFF',
    delay: '#B4411F', waiting: '#8A6D1F', completed: '#4E7A5F',
  },
  dark: {
    background: '#141311', surface: '#1E1C19', text: '#F4F2EE', muted: '#B7B0A6',
    border: '#443F38', pressed: '#2A2722', accent: '#1F6F4A', accentText: '#8ABF9E',
    onAccent: '#FFFFFF', destructive: '#B4411F', onDestructive: '#FFFFFF',
    delay: '#E79479', waiting: '#D5B45F', completed: '#91B19A',
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
export const radius = 6;
export const touch = { normal: 48, driver: 56, driverAction: 64 } as const;
export const icon = { size: 20, strokeWidth: 1.75 } as const;

export function themeMode(isDriver: boolean, scheme: string | null | undefined): Mode {
  return isDriver && scheme === 'dark' ? 'dark' : 'light';
}

export function themeVariables(mode: Mode) {
  return Object.fromEntries(Object.entries(palettes[mode]).map(([key, value]) => [`--color-${key}`, value]));
}
