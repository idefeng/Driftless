import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { fonts } from '../theme/tokens';
import { useI18n } from '../i18n/I18nContext';
import { useSession } from '../state/SessionContext';
import { FOLLOW_TOLERANCE_SPM } from '../state/sessionStats';

/**
 * 播放中的实测步频 + 跟随率（v1.2）。未开启「实测步频」时不渲染；
 * 跟上节拍（偏差 ≤ 容差）时实测数字用品牌色，否则用次要文字色，一眼可辨。
 */
export function MeasuredCadence({ target }: { target: number }) {
  const { c } = useTheme();
  const { t } = useI18n();
  const { measureEnabled, liveSpm, liveFollow } = useSession();
  if (!measureEnabled) return null;

  const onBeat = liveSpm != null && Math.abs(liveSpm - target) <= FOLLOW_TOLERANCE_SPM;
  return (
    <View style={styles.row} accessibilityLiveRegion="polite">
      <Text style={[styles.text, { color: liveSpm == null ? c.textFaint : onBeat ? c.brandText : c.textMuted }]}>
        {liveSpm == null ? t('live.waiting') : t('live.measured', { spm: liveSpm })}
      </Text>
      {liveFollow != null && (
        <Text style={[styles.text, { color: c.textFaint }]}>
          {'· '}
          {t('live.follow', { pct: Math.round(liveFollow * 100) })}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  text: { fontFamily: fonts.bodyBold, fontSize: 13, fontVariant: ['tabular-nums'] },
});
