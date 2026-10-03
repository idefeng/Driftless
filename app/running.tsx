import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { Screen } from '../src/components/Screen';
import { FootstepPulse } from '../src/components/FootstepPulse';
import { PlayPauseButton } from '../src/components/PlayPauseButton';
import { useTheme } from '../src/theme/ThemeContext';
import { fonts } from '../src/theme/tokens';
import { useCadence, formatClock } from '../src/state/CadenceContext';
import { useI18n } from '../src/i18n/I18nContext';
import { getBpmThermalColor } from '../src/theme/thermalColor';
import { MeasuredCadence } from '../src/components/MeasuredCadence';

export default function Running() {
  const { c, isDark } = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const { plan, phaseIndex, phaseEndAtMs, running, bpm, isPlaying, rampTarget, step, togglePlay, skipPhase, stopWorkout } =
    useCadence();

  const phase = plan[phaseIndex] ?? plan[0];
  // 阶段多（如间歇跑模板 13 段）时一行放不下全部名称：只给当前段显示名称，其余收成圆点。
  const compactStepper = plan.length > 5;
  const next = plan[phaseIndex + 1];

  // Dynamic thermal color for current active cadence during workout
  const thermal = getBpmThermalColor(bpm, isDark);

  // 秒级倒计时在本地推导
  const [remainingSec, setRemainingSec] = useState(() =>
    Math.max(0, Math.ceil((phaseEndAtMs - Date.now()) / 1000)),
  );
  useEffect(() => {
    if (!running || !isPlaying) return;
    const update = () => setRemainingSec(Math.max(0, Math.ceil((phaseEndAtMs - Date.now()) / 1000)));
    update();
    const timer = setInterval(update, 500);
    return () => clearInterval(timer);
  }, [running, isPlaying, phaseEndAtMs]);

  const elapsed = phase.durationSec - remainingSec;
  const progress = Math.min(1, Math.max(0, elapsed / phase.durationSec));

  // 训练自然结束时自动退出运行页
  const manualStopRef = useRef(false);
  const prevRunningRef = useRef(running);
  useEffect(() => {
    if (prevRunningRef.current && !running && !manualStopRef.current) {
      if (router.canGoBack()) router.back();
      else router.replace('/');
    }
    prevRunningRef.current = running;
  }, [running, router]);

  const onClose = () => {
    manualStopRef.current = true;
    stopWorkout();
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  return (
    <Screen gradient>
      {/* phase stepper */}
      <View style={styles.stepper}>
        {plan.map((p, i) => {
          const done = i < phaseIndex;
          const active = i === phaseIndex;
          return (
            <React.Fragment key={p.id}>
              {i > 0 && (
                <View
                  style={[
                    compactStepper ? styles.stepperLineCompact : styles.stepperLine,
                    { backgroundColor: c.trackInactive },
                  ]}
                />
              )}
              <View style={[compactStepper ? styles.stepperItemCompact : styles.stepperItem, { opacity: active ? 1 : 0.5 }]}>
                {done ? (
                  <View style={[styles.stepDot, { backgroundColor: c.trackInactive }]}>
                    <Svg width={10} height={8} viewBox="0 0 10 8" fill="none">
                      <Path d="M1 4l3 3 5-6" stroke={c.textFaint} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                    </Svg>
                  </View>
                ) : (
                  <View
                    style={[
                      styles.stepDotSmall,
                      active
                        ? { backgroundColor: thermal.base }
                        : { borderWidth: 1.5, borderColor: isDark ? '#6B6253' : '#C7BEAF' },
                    ]}
                  />
                )}
                {(!compactStepper || active) && (
                  <Text
                    numberOfLines={1}
                    style={{
                      fontFamily: active ? fonts.bodyBold : fonts.bodySemiBold,
                      fontSize: 12,
                      color: active ? thermal.base : c.textFaint,
                      flexShrink: 1,
                    }}
                  >
                    {p.name}
                  </Text>
                )}
              </View>
            </React.Fragment>
          );
        })}
      </View>

      {/* center */}
      <View style={styles.center}>
        <View style={styles.kickerRow}>
          <Text style={[styles.kicker, { color: c.textFaint }]}>
            {t('running.phaseProgress', { name: phase.name, current: phaseIndex + 1, total: plan.length })}
          </Text>
          <View style={[styles.thermalBadge, { backgroundColor: thermal.chipBg }]}>
            <Text style={[styles.thermalText, { color: thermal.text }]}>{t(thermal.labelKey)}</Text>
          </View>
        </View>

        <Text style={[styles.bpm, { color: c.textStrong }]}>{bpm}</Text>

        {/* 固定高度占位：渐进过渡开始/结束时不推动下方布局 */}
        <View style={styles.rampSlot}>
          {rampTarget != null && (
            <View style={[styles.rampPill, { backgroundColor: thermal.chipBg }]}>
              <Text style={[styles.rampText, { color: thermal.text }]}>
                {t('running.ramping', { bpm: rampTarget })}
              </Text>
            </View>
          )}
        </View>

        <View style={{ marginTop: 4 }}>
          <FootstepPulse color={thermal.base} glowColor={thermal.glow} size={44} running={isPlaying} />
        </View>

        <View style={{ marginTop: 14 }}>
          <MeasuredCadence target={bpm} />
        </View>

        {/* segment remaining + progress */}
        <View style={{ width: '100%', marginTop: 30 }}>
          <View style={styles.remainRow}>
            <Text style={[styles.remainLabel, { color: c.textMuted }]}>{t('running.remaining')}</Text>
            <Text style={[styles.remainTime, { color: c.textStrong }]}>{formatClock(remainingSec)}</Text>
          </View>
          <View style={styles.segTrack}>
            {plan.map((p, i) => {
              const flexBasis = p.durationSec;
              const isPast = i < phaseIndex;
              const isCurr = i === phaseIndex;
              return (
                <View key={p.id} style={{ flex: flexBasis, height: 8 }}>
                  <View style={[styles.segBg, { backgroundColor: isPast ? '#4A3B20' : c.trackInactive }]}>
                    {isCurr && (
                      <View
                        style={{
                          position: 'absolute',
                          left: 0,
                          top: 0,
                          bottom: 0,
                          width: `${progress * 100}%`,
                          borderRadius: 100,
                          backgroundColor: thermal.base,
                        }}
                      />
                    )}
                    {isPast && <View style={[styles.segFull, { backgroundColor: thermal.base }]} />}
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* next-up chip */}
        {next && (
          <View style={[styles.nextChip, { backgroundColor: c.cardAlt }]}>
            <Text style={{ fontFamily: fonts.bodySemiBold, fontSize: 12.5, color: c.textFaint }}>
              {t('running.nextPhase')}
            </Text>
            <Text style={{ fontFamily: fonts.bodyBold, fontSize: 13, color: c.brandText }}>
              {next.name} · {next.bpm} SPM
            </Text>
          </View>
        )}
      </View>

      {/* transport: −1 / play / +1 */}
      <View style={styles.transport}>
        <Pressable onPress={() => step(-1)} style={[styles.sideBtn, { borderColor: isDark ? 'rgba(255,255,255,0.18)' : c.divider }]}>
          <Text style={[styles.sideTxt, { color: c.text }]}>−1</Text>
        </Pressable>
        <PlayPauseButton playing={isPlaying} onPress={togglePlay} />
        <Pressable onPress={() => step(1)} style={[styles.sideBtn, { borderColor: isDark ? 'rgba(255,255,255,0.18)' : c.divider }]}>
          <Text style={[styles.sideTxt, { color: c.text }]}>+1</Text>
        </Pressable>
      </View>

      {/* secondary actions */}
      <View style={styles.footer}>
        <Pressable onPress={skipPhase} hitSlop={8}>
          <Text style={[styles.footerBtn, { color: c.textMuted }]}>{t('running.skipPhase')}</Text>
        </Pressable>
        <Pressable onPress={onClose} hitSlop={8}>
          <Text style={[styles.footerBtn, { color: c.textMuted }]}>{t('running.endWorkout')}</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingTop: 6,
  },
  stepperItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  stepperLine: { height: 2, width: 14 },
  stepperItemCompact: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0 },
  stepperLineCompact: { height: 2, flex: 1, minWidth: 4 },
  stepDot: { width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  stepDotSmall: { width: 8, height: 8, borderRadius: 4 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  kickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  kicker: { fontFamily: fonts.bodyBold, fontSize: 12, letterSpacing: 2, textTransform: 'uppercase' },
  rampSlot: { height: 26, marginTop: 6, justifyContent: 'center' },
  rampPill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 100 },
  rampText: { fontFamily: fonts.bodyBold, fontSize: 12, fontVariant: ['tabular-nums'] },
  thermalBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  thermalText: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
  },
  bpm: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 130,
    lineHeight: 130 * 0.92,
    letterSpacing: -6,
    marginTop: 6,
    fontVariant: ['tabular-nums'],
    includeFontPadding: false,
  },
  remainRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 9 },
  remainLabel: { fontFamily: fonts.bodySemiBold, fontSize: 13 },
  remainTime: { fontFamily: fonts.displayBold, fontSize: 26, fontVariant: ['tabular-nums'] },
  segTrack: { flexDirection: 'row', gap: 3, height: 8 },
  segBg: { flex: 1, borderRadius: 100, overflow: 'hidden' },
  segFull: { position: 'absolute', inset: 0 },
  nextChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 100,
  },
  transport: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24 },
  sideBtn: { width: 64, height: 64, borderRadius: 32, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  sideTxt: { fontFamily: fonts.displaySemiBold, fontSize: 22 },
  footer: { flexDirection: 'row', justifyContent: 'center', gap: 40, marginTop: 20 },
  footerBtn: { fontFamily: fonts.bodySemiBold, fontSize: 14 },
});
