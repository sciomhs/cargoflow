import { vars } from 'nativewind';
import { createContext, useContext, type ReactNode } from 'react';
import { useColorScheme, View } from 'react-native';

import { useSession } from '@/store/session';

import { palettes, themeMode, themeVariables, type Colors, type Mode } from './tokens';

const ThemeContext = createContext<{ mode: Mode; colors: Colors; isDriver: boolean }>({
  mode: 'light', colors: palettes.light, isDriver: false,
});

export function ThemeProvider({ children, mode: override }: { children: ReactNode; mode?: Mode }) {
  const isDriver = useSession((state) => state.role === 'driver');
  const scheme = useColorScheme();
  const mode = override ?? themeMode(isDriver, scheme);
  const colors = palettes[mode];
  return (
    <ThemeContext.Provider value={{ mode, colors, isDriver }}>
      <View style={[{ flex: 1, backgroundColor: colors.background }, vars(themeVariables(mode))]}>
        {children}
      </View>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
