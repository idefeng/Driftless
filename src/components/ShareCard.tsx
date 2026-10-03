import React, { forwardRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { brand, fonts, palettes } from '../theme/tokens';
import { FootprintPair } from './Footprint';
import { CadenceSparkline } from './CadenceSparkline';
import { useI18n } from '../i18n/I18nContext';
import type { SessionRecord } from '../state/sessionStats';
import { formatDate, formatDuration } from '../utils/format';

// 分享卡片是品牌物料：固定用黑底荧光绿（standard 调色板），不随日光模式变白。
const p = palettes.standard;

export const SHARE_CARD_WIDTH = 320;
const CHART_W = SHARE_CARD_WIDTH - 2 * 22;

/**
 * 训练分享卡片（v1.2）。纯展示组件，由 ShareSessionModal 用 react-native-view-shot
 * 截成 PNG。主视觉优先展示跟随率；未测步频的记录退回展示平均目标步频。
 */
export const ShareCard = forwardRef<View, { record: SessionRecord }>(function ShareCard({ record }, ref) {
  const { t, language } = useI18n();
  const hasFollow = record.followRate != null;

  const stats: { label: string; value: string }[] = [
    { label: t('card.duration'), value: formatDuration(record.durationSec) },
    { label: t('card.target'), value: `${record.avgTarget}` },
    { label: t('card.measured'), value: record.avgSpm != null ? `${record.avgSpm}` : '—' },
    { label: t('card.steps'), value: record.steps != null ? `${record.steps}` : '—' },
  ];

  return (
    // collapsable={false}：Android 上避免该 View 被布局优化掉，否则 captureRef 找不到原生视图。
    <View ref={ref} collapsable={false} style={styles.card}>
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <FootprintPair size={22} lead={brand.base} />
          <Text style={styles.brandName}>Driftless</Text>
        </View>
        <Text style={styles.date}>{formatDate(record.startedAt, language)}</Text>
      </View>

      <Text style={styles.title} numberOfLines={1}>
        {record.planName ?? t('history.freeRun')}
      </Text>

      <View style={styles.hero}>
        <Text style={styles.heroValue}>
          {hasFollow ? Math.round((record.followRate as number) * 100) : record.avgTarget}
          <Text style={styles.heroUnit}>{hasFollow ? '%' : ' SPM'}</Text>
        </Text>
        <Text style={styles.heroLabel}>{hasFollow ? t('card.onBeat') : t('card.avgTarget')}</Text>
      </View>

      <View style={styles.stats}>
        {stats.map((s) => (
          <View key={s.label} style={styles.stat}>
            <Text style={styles.statValue}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* 没有实测读数时曲线只剩一条目标虚线，不画。 */}
      {record.series.length >= 2 && record.series.some((pt) => pt.spm != null) && (
        <View style={styles.chart}>
          <CadenceSparkline
            series={record.series}
            width={CHART_W}
            height={64}
            targetColor={p.textFaint}
            spmColor={brand.base}
            strokeScale={1.3}
          />
          <View style={styles.legend}>
            <View style={styles.legendDash} />
            <Text style={styles.legendText}>{t('history.legendTarget')}</Text>
            <View style={styles.legendLine} />
            <Text style={styles.legendText}>{t('history.legendMeasured')}</Text>
          </View>
        </View>
      )}

      <Text style={styles.footer}>{t('card.footer')}</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    width: SHARE_CARD_WIDTH,
    padding: 22,
    borderRadius: 28,
    backgroundColor: p.bg,
    borderWidth: 1,
    borderColor: 'rgba(198,255,61,0.22)',
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  brandName: { fontFamily: fonts.displayBold, fontSize: 15, color: p.text, letterSpacing: -0.3 },
  date: { fontFamily: fonts.bodyMedium, fontSize: 12, color: p.textFaint },
  title: { fontFamily: fonts.bodyBold, fontSize: 17, color: p.text, marginTop: 22 },
  hero: { marginTop: 6 },
  heroValue: {
    fontFamily: fonts.displayBold,
    fontSize: 72,
    lineHeight: 78,
    color: brand.base,
    letterSpacing: -3,
    fontVariant: ['tabular-nums'],
  },
  heroUnit: { fontSize: 28, letterSpacing: 0, color: brand.base },
  heroLabel: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: p.textMuted, marginTop: -2 },
  stats: {
    flexDirection: 'row',
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: p.divider,
  },
  stat: { flex: 1, gap: 2 },
  statValue: { fontFamily: fonts.displaySemiBold, fontSize: 17, color: p.textStrong, fontVariant: ['tabular-nums'] },
  statLabel: { fontFamily: fonts.bodyMedium, fontSize: 11, color: p.textFaint },
  chart: { marginTop: 18, gap: 8 },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDash: { width: 12, borderTopWidth: 1.5, borderStyle: 'dashed', borderColor: p.textFaint },
  legendLine: { width: 12, height: 2, borderRadius: 1, backgroundColor: brand.base, marginLeft: 8 },
  legendText: { fontFamily: fonts.bodyMedium, fontSize: 10.5, color: p.textFaint },
  footer: { fontFamily: fonts.bodySemiBold, fontSize: 11, color: p.textFaint, marginTop: 18, letterSpacing: 0.3 },
});
