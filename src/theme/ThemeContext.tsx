import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { Palette, palettes, ColorScheme } from './tokens';

interface ThemeValue {
  scheme: ColorScheme;
  c: Palette;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeValue>({
  scheme: 'light',
  c: palettes.light,
  isDark: false,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const scheme: ColorScheme = system === 'dark' ? 'dark' : 'light';
  const value = useMemo<ThemeValue>(
    () => ({ scheme, c: palettes[scheme], isDark: scheme === 'dark' }),
    [scheme],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
