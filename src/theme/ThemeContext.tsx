import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Palette, palettes, ColorScheme, VisualMode } from './tokens';

const STORAGE_KEY_VISUAL_MODE = '@driftless/visual_mode';

interface ThemeValue {
  scheme: ColorScheme;
  c: Palette;
  isDark: boolean;
  visualMode: VisualMode;
  setVisualMode: (mode: VisualMode) => void;
}

const ThemeContext = createContext<ThemeValue>({
  scheme: 'dark',
  c: palettes.standard,
  isDark: true,
  visualMode: 'standard',
  setVisualMode: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [visualMode, setVisualModeState] = useState<VisualMode>('standard');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY_VISUAL_MODE).then((val) => {
      // 旧版的 'midnight'（夜跑红光）已移除，回落到默认黑底。
      if (val === 'solar') setVisualModeState('solar');
    }).catch(() => {});
  }, []);

  const setVisualMode = (mode: VisualMode) => {
    setVisualModeState(mode);
    AsyncStorage.setItem(STORAGE_KEY_VISUAL_MODE, mode).catch(() => {});
  };

  // v2 品牌：默认固定黑底（不跟随系统明暗），日光模式为白底高对比。
  const c = palettes[visualMode];
  const scheme: ColorScheme = c.scheme;
  const isDark = scheme === 'dark';

  const value = useMemo<ThemeValue>(
    () => ({ scheme, c, isDark, visualMode, setVisualMode }),
    [scheme, c, isDark, visualMode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
