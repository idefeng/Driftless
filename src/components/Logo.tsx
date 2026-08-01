import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { brand, fonts } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
import { useI18n } from '../i18n/I18nContext';

/**
 * Logo — four equidistant rounded bars with rhythmic height variation
 * (形「准」，神「动」): precise alignment, lively rhythm. Plus optional wordmark.
 */

interface LogoMarkProps {
  size?: number; // overall mark height in px
}

export function LogoMark({ size = 18 }: LogoMarkProps) {
  const { isDark } = useTheme();
  const unit = size / 18;
  const bars = [
    { h: 9 * unit, c: brand.light },
    { h: 15 * unit, c: isDark ? brand.glow : brand.base },
    { h: 18 * unit, c: isDark ? brand.base : brand.deep },
    { h: 12 * unit, c: isDark ? brand.glow : brand.base },
  ];
  return (
    <View style={[styles.markRow, { height: size, gap: Math.max(2, 3 * unit) }]}>
      {bars.map((b, i) => (
        <View
          key={i}
          style={{
            width: Math.max(3, 4 * unit),
            height: b.h,
            borderRadius: 2 * unit,
            backgroundColor: b.c,
          }}
        />
      ))}
    </View>
  );
}

interface WordmarkProps {
  size?: number;
  showTagline?: boolean;
}

export function Wordmark({ size = 17, showTagline = false }: WordmarkProps) {
  const { c } = useTheme();
  const { t } = useI18n();
  return (
    <View style={styles.brandRow}>
      <LogoMark size={size * 1.06} />
      <View>
        <Text
          style={{
            fontFamily: fonts.displayBold,
            fontSize: size,
            letterSpacing: -0.4,
            color: c.text,
          }}
        >
          Driftless
        </Text>
        {showTagline && (
          <Text
            style={{
              fontFamily: fonts.bodySemiBold,
              fontSize: size * 0.62,
              color: c.brandText,
              letterSpacing: 0.3,
              marginTop: 2,
            }}
          >
            {t('logo.tagline')}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  markRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
});
