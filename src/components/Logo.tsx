import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { fonts } from '../theme/tokens';
import { FootprintPair } from './Footprint';
import { useTheme } from '../theme/ThemeContext';
import { useI18n } from '../i18n/I18nContext';

/**
 * Logo — 两只交错的脚印（一步正在迈出）：后脚淡、前脚亮，一眼即知是跑步应用。
 * 几何见 Footprint.tsx，与 App 图标共用。Plus optional wordmark.
 */

interface LogoMarkProps {
  size?: number; // overall mark height in px
}

export function LogoMark({ size = 18 }: LogoMarkProps) {
  const { c, isDark } = useTheme();
  // 白底（日光模式）下荧光绿对比不足，改用深绿。
  return <FootprintPair size={size} lead={isDark ? c.brand : c.brandText} />;
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
      <LogoMark size={size * 1.35} />
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
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
});
