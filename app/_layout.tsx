import React, { useEffect } from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts as useSora,
  Sora_400Regular,
  Sora_500Medium,
  Sora_600SemiBold,
  Sora_700Bold,
  Sora_800ExtraBold,
} from '@expo-google-fonts/sora';
import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
} from '@expo-google-fonts/manrope';
import { ThemeProvider } from '../src/theme/ThemeContext';
import { CadenceProvider } from '../src/state/CadenceContext';
import { SessionProvider, WorkoutSummaryGate } from '../src/state/SessionContext';
import { I18nProvider } from '../src/i18n/I18nContext';
import { OtaUpdateGate } from '../src/updates/OtaUpdateGate';
import { logger } from '../src/utils/logger';
import { useOrientationPolicy } from '../src/theme/layout';
import { palettes } from '../src/theme/tokens';

void SplashScreen.preventAutoHideAsync().catch((error) => {
  logger.warn('启动屏幕保持失败。', error);
});

export default function RootLayout() {
  // RootLayout 在 ThemeProvider 外层：启动占位 / 栈背景固定用品牌 v2 默认黑底，
  // 避免启动闪白，也避免手势导航条区域露出浅色。
  const bootBg = palettes.standard.bg;
  useOrientationPolicy();
  const [loaded] = useSora({
    Sora_400Regular,
    Sora_500Medium,
    Sora_600SemiBold,
    Sora_700Bold,
    Sora_800ExtraBold,
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });

  useEffect(() => {
    if (!loaded) return;

    void SplashScreen.hideAsync().catch((error) => {
      logger.warn('启动屏幕隐藏失败。', error);
    });
  }, [loaded]);

  if (!loaded) return <View style={{ flex: 1, backgroundColor: bootBg }} />;

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <I18nProvider>
          <CadenceProvider>
            <SessionProvider>
              <OtaUpdateGate />
              <Stack
                screenOptions={{
                  headerShown: false,
                  animation: 'slide_from_right',
                  contentStyle: { backgroundColor: bootBg },
                }}
              >
                <Stack.Screen name="index" />
                <Stack.Screen name="sounds" options={{ presentation: 'card' }} />
                <Stack.Screen name="coexist" options={{ presentation: 'card' }} />
                <Stack.Screen name="settings" options={{ presentation: 'card' }} />
                <Stack.Screen name="language" options={{ presentation: 'card' }} />
                <Stack.Screen name="plan-list" options={{ presentation: 'card' }} />
                <Stack.Screen name="plan" options={{ presentation: 'card' }} />
                <Stack.Screen name="running" options={{ animation: 'slide_from_bottom' }} />
                <Stack.Screen name="history" options={{ presentation: 'card' }} />
                </Stack>
              <WorkoutSummaryGate />
            </SessionProvider>
          </CadenceProvider>
        </I18nProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
