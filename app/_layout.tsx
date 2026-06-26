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

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
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
    if (loaded) SplashScreen.hideAsync().catch(() => {});
  }, [loaded]);

  if (!loaded) return <View style={{ flex: 1, backgroundColor: '#F7F5F2' }} />;

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <CadenceProvider>
          <Stack
            screenOptions={{
              headerShown: false,
              animation: 'slide_from_right',
              contentStyle: { backgroundColor: '#F7F5F2' },
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen name="sounds" options={{ presentation: 'card' }} />
            <Stack.Screen name="coexist" options={{ presentation: 'card' }} />
            <Stack.Screen name="plan" options={{ presentation: 'card' }} />
            <Stack.Screen name="running" options={{ animation: 'slide_from_bottom' }} />
          </Stack>
        </CadenceProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
