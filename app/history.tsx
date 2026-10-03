import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Alert } from 'react-native';
import Svg, { Polyline } from 'react-native-svg';
import { Screen } from '../src/components/Screen';
import { SubHeader } from '../src/components/SubHeader';
import { useTheme } from '../src/theme/ThemeContext';
import { fonts } from '../src/theme/tokens';
import { formatClock } from '../src/state/CadenceContext';
import { useSession } from '../src/state/SessionContext';
import { SessionRecord, summarizeSince } from '../src/state/sessionStats';
import { useI18n } from '../src/i18n/I18nContext';
import type { AppLanguage } from '../src/i18n/language';

const WEEK_MS = 7 * 24 * 3600 * 1000;
const EN_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// 手写日期格式，不依赖 Hermes 的 Intl 完整度。
function formatDate(ms: number, language: AppLanguage): string {
  const d = new Date(ms);
  const hm = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  return language === 'zh'
    ? `${d.getMonth() + 1}月${d.getDate()}日 ${hm}`
    : `${EN_MONTHS[d.getMonth()]} ${d.getDate()}, ${hm}`;
}

/** 时长：不足 1 小时显示 m:ss，否则 h:mm:ss。 */
function formatDuration(sec: number): string {
  if (sec < 3600) return formatClock(sec);
  const h = Math.floor(sec / 3600);
  return `${h}:${formatClock(sec % 3600).padStart(5, '0')}`;
}

const SPARK_W = 120;
const SPARK_H = 36;

/** 目标（虚线、弱色）与实测（品牌色）步频曲线；纵轴按两者共同范围自适应。 */
function Sparkline({ record, targetColor, spmColor }: { record: SessionRecord; targetColor: string; spmColor: string }) {
  const { series } = record;
  if (series.length < 2) return null;
  const values = series.flatMap((p) => (p.spm == null ? [p.target] : [p.target, p.spm]));
  const lo = Math.min(...values) - 3;
  const hi = Math.max(...values) + 3;
  const x = (i: number) => (i / (series.length - 1)) * SPARK_W;
  const y = (v: number) => SPARK_H - ((v - lo) / (hi - lo)) * SPARK_H;
  const target = series.map((p, i) => `${x(i).toFixed(1)},${y(p.target).toFixed(1)}`).join(' ');
  // 实测曲线遇到没有读数的点会断开，分段绘制。
  const spmSegments: string[] = [];
  let current: string[] = [];
  series.forEach((p, i) => {
    if (p.spm == null) {
      if (current.length > 1) spmSegments.push(current.join(' '));
      current = [];
    } else {
      current.push(`${x(i).toFixed(1)},${y(p.spm).toFixed(1)}`);
    }
  });
  if (current.length > 1) spmSegments.push(current.join(' '));

  return (
    <Svg width={SPARK_W} height={SPARK_H}>
      <Polyline points={target} fill="none" stroke={targetColor} strokeWidth={1.5} strokeDasharray="3 3" />
      {spmSegments.map((pts, i) => (
        <Polyline key={i} points={pts} fill="none" stroke={spmColor} strokeWidth={2} strokeLinejoin="round" />
      ))}
    </Svg>
  );
}

export default function History() {
  const { c, isDark } = useTheme();
  const { t, language } = useI18n();
  const { history, deleteRecord, clearHistory } = useSession();

  // 进入页面时取一次「现在」即可，最近 7 天的边界不需要实时滚动。
  const week = useMemo(() => summarizeSince(history, Date.now() - WEEK_MS), [history]);

  const confirmDelete = (r: SessionRecord) => {
    Alert.alert(t('history.deleteTitle'), t('history.deleteMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: () => deleteRecord(r.id) },
    ]);
  };

  const confirmClear = () => {
    Alert.alert(t('history.clearTitle'), t('history.clearMessage', { count: history.length }), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: clearHistory },
    ]);
  };

  return (
    <Screen>
      <SubHeader title={t('history.title')} subtitle={t('history.subtitle')} />

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {/* Last 7 days */}
        <View style={[styles.summary, { backgroundColor: c.card, shadowOpacity: isDark ? 0 : 0.05 }]}>
          <Text style={[styles.summaryKicker, { color: c.textFaint }]}>{t('history.week')}</Text>
          <View style={styles.summaryRow}>
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: c.textStrong }]}>{week.count}</Text>
              <Text style={[styles.statLabel, { color: c.textFaint }]}>{t('history.runs')}</Text>
            </View>
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: c.textStrong }]}>{formatDuration(week.totalSec)}</Text>
              <Text style={[styles.statLabel, { color: c.textFaint }]}>{t('history.time')}</Text>
            </View>
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: week.followRate != null ? c.brandText : c.textFaint }]}>
                {week.followRate != null ? `${Math.round(week.followRate * 100)}%` : '—'}
              </Text>
              <Text style={[styles.statLabel, { color: c.textFaint }]}>{t('history.follow')}</Text>
            </View>
          </View>
        </View>

        {history.length === 0 ? (
          <Text style={[styles.empty, { color: c.textFaint }]}>{t('history.empty')}</Text>
        ) : (
          <>
            <View style={styles.legend}>
              <View style={[styles.legendDash, { borderColor: c.textFaint }]} />
              <Text style={[styles.legendText, { color: c.textFaint }]}>{t('history.legendTarget')}</Text>
              <View style={[styles.legendLine, { backgroundColor: c.brand }]} />
              <Text style={[styles.legendText, { color: c.textFaint }]}>{t('history.legendMeasured')}</Text>
            </View>

            {history.map((r) => (
              <Pressable
                key={r.id}
                onLongPress={() => confirmDelete(r)}
                delayLongPress={400}
                accessibilityRole="button"
                accessibilityLabel={`${formatDate(r.startedAt, language)} ${r.planName ?? t('history.freeRun')}`}
              >
                <View style={[styles.card, { backgroundColor: c.card, shadowOpacity: isDark ? 0 : 0.05 }]}>
                  <View style={{ flex: 1, gap: 3 }}>
                    <Text style={[styles.cardDate, { color: c.textFaint }]}>{formatDate(r.startedAt, language)}</Text>
                    <Text style={[styles.cardTitle, { color: c.text }]} numberOfLines={1}>
                      {r.planName ?? t('history.freeRun')} · {formatDuration(r.durationSec)}
                    </Text>
                    <Text style={[styles.cardMeta, { color: c.textMuted }]}>
                      {t('history.target', { bpm: r.avgTarget })}
                      {' · '}
                      {r.avgSpm != null ? t('history.measured', { spm: r.avgSpm }) : t('history.noMeasure')}
                      {r.steps != null ? ` · ${t('history.steps', { steps: r.steps })}` : ''}
                    </Text>
                  </View>
                  <View style={styles.cardRight}>
                    {r.followRate != null && (
                      <View style={[styles.followPill, { backgroundColor: c.chipAccent }]}>
                        <Text style={[styles.followText, { color: c.brandText }]}>
                          {Math.round(r.followRate * 100)}%
                        </Text>
                      </View>
                    )}
                    <Sparkline record={r} targetColor={c.textFaint} spmColor={c.brand} />
                  </View>
                </View>
              </Pressable>
            ))}

            <Text style={[styles.hint, { color: c.textFaint }]}>{t('history.deleteHint')}</Text>
            <Pressable onPress={confirmClear} hitSlop={8} accessibilityRole="button" style={styles.clearBtn}>
              <Text style={[styles.clearText, { color: c.textMuted }]}>{t('history.clear')}</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, paddingTop: 14, gap: 12 },
  summary: {
    padding: 16,
    borderRadius: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    elevation: 1,
  },
  summaryKicker: { fontFamily: fonts.bodyBold, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase' },
  summaryRow: { flexDirection: 'row', marginTop: 10 },
  stat: { flex: 1, gap: 2 },
  statValue: { fontFamily: fonts.displayBold, fontSize: 24, fontVariant: ['tabular-nums'] },
  statLabel: { fontFamily: fonts.bodyMedium, fontSize: 12 },
  empty: { fontFamily: fonts.bodyMedium, fontSize: 13.5, textAlign: 'center', marginTop: 32, lineHeight: 20 },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'flex-end', marginTop: 4 },
  legendDash: { width: 14, borderTopWidth: 1.5, borderStyle: 'dashed' },
  legendLine: { width: 14, height: 2, borderRadius: 1, marginLeft: 8 },
  legendText: { fontFamily: fonts.bodyMedium, fontSize: 11.5 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    elevation: 1,
  },
  cardDate: { fontFamily: fonts.bodyMedium, fontSize: 12 },
  cardTitle: { fontFamily: fonts.bodyBold, fontSize: 16 },
  cardMeta: { fontFamily: fonts.bodyMedium, fontSize: 12.5, fontVariant: ['tabular-nums'] },
  cardRight: { alignItems: 'flex-end', gap: 8 },
  followPill: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 10 },
  followText: { fontFamily: fonts.bodyBold, fontSize: 12.5, fontVariant: ['tabular-nums'] },
  hint: { fontFamily: fonts.bodyMedium, fontSize: 12, textAlign: 'center', marginTop: 6 },
  clearBtn: { alignSelf: 'center', paddingVertical: 8 },
  clearText: { fontFamily: fonts.bodyBold, fontSize: 13 },
});
