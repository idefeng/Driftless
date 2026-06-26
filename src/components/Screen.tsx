import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../theme/ThemeContext';

interface ScreenProps {
  children: React.ReactNode;
  gradient?: boolean;
  padded?: boolean;
  style?: ViewStyle;
}

export function Screen({ children, gradient = false, padded = true, style }: ScreenProps) {
  const { c, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const pad = {
    paddingTop: insets.top + (padded ? 6 : 0),
    paddingBottom: Math.max(insets.bottom, 14) + (padded ? 8 : 0),
  };

  const inner = (
    <View style={[styles.fill, pad, style]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      {children}
    </View>
  );

  if (gradient) {
    return (
      <LinearGradient colors={[c.bgGradientTop, c.bgGradientBottom]} style={styles.fill}>
        {inner}
      </LinearGradient>
    );
  }
  return <View style={[styles.fill, { backgroundColor: c.bg }]}>{inner}</View>;
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
