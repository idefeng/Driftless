import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Palette, palettes, visualPalettes, ColorScheme, VisualMode } from './tokens';

const STORAGE_KEY_VISUAL_MODE = '@driftless/visual_mode';

interface ThemeValue {
  scheme: ColorScheme;
  c: Palette;
  isDark: boolean;
  visualMode: VisualMode;
  setVisualMode: (mode: VisualMode) => void;
}

const ThemeContext = createContext<ThemeValue>({
  scheme: 'light',
  c: palettes.light,
  isDark: false,
  visualMode: 'standard',
  setVisualMode: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [visualMode, setVisualModeState] = useState<VisualMode>('standard');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY_VISUAL_MODE).then((val) => {
      if (val === 'solar' || val === 'midnight' || val === 'standard') {
        setVisualModeState(val as VisualMode);
      }
    }).catch(() => {});
  }, []);

  const setVisualMode = (mode: VisualMode) => {
    setVisualModeState(mode);
    AsyncStorage.setItem(STORAGE_KEY_VISUAL_MODE, mode).catch(() => {});
  };

  const scheme: ColorScheme =
    visualMode === 'midnight' ? 'dark' : visualMode === 'solar' ? 'light' : system === 'dark' ? 'dark' : 'light';

  const c: Palette = useMemo(() => {
    if (visualMode === 'solar') return visualPalettes.solar;
    if (visualMode === 'midnight') return visualPalettes.midnight;
    return palettes[scheme];
  }, [visualMode, scheme]);

  const isDark = c.scheme === 'dark';

  const value = useMemo<ThemeValue>(
    () => ({ scheme, c, isDark, visualMode, setVisualMode }),
    [scheme, c, isDark, visualMode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
