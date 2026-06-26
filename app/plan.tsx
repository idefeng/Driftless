import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen } from '../src/components/Screen';
import { SubHeader } from '../src/components/SubHeader';
import { useTheme } from '../src/theme/ThemeContext';
import { fonts, brand } from '../src/theme/tokens';
import { useCadence, formatClock } from '../src/state/CadenceContext';

export default function Plan() {
  const { c, isDark } = useTheme();
  const router = useRouter();
  const { plan, startWorkout } = useCadence();

  const totalSec = plan.reduce((a, p) => a + p.durationSec, 0);
  const avg = Math.round(plan.reduce((a, p) => a + p.bpm * p.durationSec, 0) / totalSec);
  const activeIdx = 1; // 巡航 highlighted in the design

  const onStart = () => {
    startWorkout();
    router.push('/running');
  };

  return (
    <Screen>
      <SubHeader title="训练计划" subtitle="间歇步频流水线 · 阶段间无缝换算" />

      <ScrollView contentContainerStyle={{ padding: 18, paddingTop: 20 }} showsVerticalScrollIndicator={false}>
        {plan.map((p, i) => {
          const active = i === activeIdx;
          return (
            <View key={p.id}>
              <View
                style={[
                  styles.phase,
                  {
                    backgroundColor: c.card,
                    borderColor: active ? brand.base : 'transparent',
                    borderWidth: 2,
                    shadowOpacity: active ? 0.14 : isDark ? 0 : 0.05,
                    shadowColor: active ? brand.deep : '#000',
                  },
                ]}
              >
                <View style={[styles.bar, { backgroundColor: p.color }]} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.phaseName, { color: c.text }]}>{p.name}</Text>
                  <Text style={[styles.phaseTime, { color: c.textFaint }]}>{formatClock(p.durationSec)}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.phaseBpm, { color: c.text }]}>{p.bpm}</Text>
                  <Text style={[styles.phaseUnit, { color: c.textFaint }]}>SPM</Text>
                </View>
              </View>

              {i < plan.length - 1 && (
                <View style={styles.connector}>
                  <View style={[styles.connectorLine, { backgroundColor: c.trackInactive }]} />
                  <View style={[styles.connectorPill, { backgroundColor: isDark ? 'rgba(255,140,43,0.18)' : '#FFEAD6' }]}>
                    <Text style={{ fontFamily: fonts.bodyBold, fontSize: 11, color: c.brandText }}>
                      ↑ 无缝换算 +{plan[i + 1].bpm - p.bpm}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          );
        })}

        <View style={[styles.addPhase, { borderColor: isDark ? '#3A3328' : '#D8D1C6' }]}>
          <Text style={{ fontFamily: fonts.bodyBold, fontSize: 14, color: c.textFaint }}>+ 添加阶段</Text>
        </View>
      </ScrollView>

      <View style={{ paddingHorizontal: 16 }}>
        <View style={styles.summary}>
          <Text style={[styles.summaryText, { color: c.textFaint }]}>总时长 {formatClock(totalSec)}</Text>
          <Text style={[styles.summaryText, { color: c.textFaint }]}>平均 ~{avg} SPM</Text>
        </View>
        <Pressable onPress={onStart}>
          <LinearGradient
            colors={[brand.glow, brand.deep]}
            start={{ x: 0.15, y: 0 }}
            end={{ x: 0.85, y: 1 }}
            style={styles.startBtn}
          >
            <View style={styles.startTri} />
            <Text style={styles.startText}>开始训练</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  phase: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 15,
    paddingHorizontal: 16,
    borderRadius: 20,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 14,
    elevation: 2,
  },
  bar: { width: 10, height: 46, borderRadius: 6 },
  phaseName: { fontFamily: fonts.bodyBold, fontSize: 17 },
  phaseTime: { fontFamily: fonts.bodyMedium, fontSize: 12.5, marginTop: 1 },
  phaseBpm: { fontFamily: fonts.displayExtraBold, fontSize: 30, fontVariant: ['tabular-nums'] },
  phaseUnit: { fontFamily: fonts.bodySemiBold, fontSize: 11, letterSpacing: 1 },
  connector: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 7, paddingLeft: 26 },
  connectorLine: { width: 2, height: 20 },
  connectorPill: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 100 },
  addPhase: {
    marginTop: 14,
    paddingVertical: 13,
    borderRadius: 18,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  summary: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4, paddingBottom: 12 },
  summaryText: { fontFamily: fonts.bodySemiBold, fontSize: 13 },
  startBtn: {
    height: 56,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: brand.deep,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 6,
  },
  startTri: {
    width: 0,
    height: 0,
    borderTopWidth: 9,
    borderBottomWidth: 9,
    borderLeftWidth: 15,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: '#fff',
  },
  startText: { fontFamily: fonts.displayBold, fontSize: 18, color: '#fff' },
});
