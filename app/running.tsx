import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { Screen } from '../src/components/Screen';
import { BeatBars } from '../src/components/BeatBars';
import { PlayPauseButton } from '../src/components/PlayPauseButton';
import { useTheme } from '../src/theme/ThemeContext';
import { fonts, brand } from '../src/theme/tokens';
import { useCadence, formatClock } from '../src/state/CadenceContext';

export default function Running() {
  const { c, isDark } = useTheme();
  const router = useRouter();
  const { plan, phaseIndex, phaseRemainingSec, bpm, isPlaying, step, togglePlay, skipPhase, stopWorkout } =
    useCadence();

  const phase = plan[phaseIndex] ?? plan[0];
  const next = plan[phaseIndex + 1];
  const elapsed = phase.durationSec - phaseRemainingSec;
  const progress = Math.min(1, Math.max(0, elapsed / phase.durationSec));

  const onClose = () => {
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
              {i > 0 && <View style={[styles.stepperLine, { backgroundColor: c.trackInactive }]} />}
              <View style={[styles.stepperItem, { opacity: active ? 1 : 0.5 }]}>
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
                        ? { backgroundColor: brand.base }
                        : { borderWidth: 1.5, borderColor: isDark ? '#6B6253' : '#C7BEAF' },
                    ]}
                  />
                )}
                <Text
                  style={{
                    fontFamily: active ? fonts.bodyBold : fonts.bodySemiBold,
                    fontSize: 12,
                    color: active ? c.brandText : c.textFaint,
                  }}
                >
                  {p.name}
                </Text>
              </View>
            </React.Fragment>
          );
        })}
      </View>

      {/* center */}
      <View style={styles.center}>
        <Text style={[styles.kicker, { color: c.textFaint }]}>
          {phase.name} · 第 {phaseIndex + 1} / {plan.length} 段
        </Text>
        <Text style={[styles.bpm, { color: c.textStrong }]}>{bpm}</Text>

        <View style={{ marginTop: 18 }}>
          <BeatBars
            color={isDark ? brand.glow : brand.base}
            centerColor={brand.light}
            barWidth={6}
            height={42}
            gap={10}
            running={isPlaying}
          />
        </View>

        {/* segment remaining + progress */}
        <View style={{ width: '100%', marginTop: 34 }}>
          <View style={styles.remainRow}>
            <Text style={[styles.remainLabel, { color: c.textMuted }]}>本段剩余</Text>
            <Text style={[styles.remainTime, { color: c.textStrong }]}>{formatClock(phaseRemainingSec)}</Text>
          </View>
          <View style={styles.segTrack}>
            {plan.map((p, i) => {
              const flexBasis = p.durationSec;
              const isPast = i < phaseIndex;
              const isCurr = i === phaseIndex;
              return (
                <View key={p.id} style={{ flex: flexBasis, height: 8 }}>
                  <View style={[styles.segBg, { backgroundColor: isPast ? '#5A4A30' : c.trackInactive }]}>
                    {isCurr && (
                      <View
                        style={{
                          position: 'absolute',
                          left: 0,
                          top: 0,
                          bottom: 0,
                          width: `${progress * 100}%`,
                          borderRadius: 100,
                          backgroundColor: brand.deep,
                        }}
                      />
                    )}
                    {isPast && <View style={[styles.segFull, { backgroundColor: brand.deep }]} />}
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* next-up chip */}
        {next && (
          <View style={[styles.nextChip, { backgroundColor: c.cardAlt }]}>
            <Text style={{ fontFamily: fonts.bodySemiBold, fontSize: 12.5, color: c.textFaint }}>下一段</Text>
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
          <Text style={[styles.footerBtn, { color: c.textMuted }]}>跳过本段</Text>
        </Pressable>
        <Pressable onPress={onClose} hitSlop={8}>
          <Text style={[styles.footerBtn, { color: c.textMuted }]}>结束训练</Text>
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
  stepDot: { width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  stepDotSmall: { width: 8, height: 8, borderRadius: 4 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  kicker: { fontFamily: fonts.bodyBold, fontSize: 12, letterSpacing: 2, textTransform: 'uppercase' },
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
    marginTop: 24,
    paddingHorizontal: 15,
    paddingVertical: 9,
    borderRadius: 100,
  },
  transport: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24 },
  sideBtn: { width: 64, height: 64, borderRadius: 32, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  sideTxt: { fontFamily: fonts.displaySemiBold, fontSize: 22 },
  footer: { flexDirection: 'row', justifyContent: 'center', gap: 40, marginTop: 22 },
  footerBtn: { fontFamily: fonts.bodySemiBold, fontSize: 14 },
});
