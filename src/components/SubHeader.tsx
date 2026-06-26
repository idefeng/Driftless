import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { RoundIconButton, BackIcon } from './ui';
import { fonts } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';

export function SubHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  const { c } = useTheme();
  const router = useRouter();
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <RoundIconButton onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}>
          <BackIcon />
        </RoundIconButton>
        <Text style={[styles.title, { color: c.text }]}>{title}</Text>
      </View>
      {subtitle && <Text style={[styles.sub, { color: c.textFaint }]}>{subtitle}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 20, paddingTop: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { fontFamily: fonts.displayBold, fontSize: 26, letterSpacing: -0.6 },
  sub: { fontFamily: fonts.bodyMedium, fontSize: 13, marginTop: 8, marginLeft: 50 },
});
