import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen } from '../src/components/Screen';
import { SubHeader } from '../src/components/SubHeader';
import { MiniStepper } from '../src/components/MiniStepper';
import { useTheme } from '../src/theme/ThemeContext';
import { fonts, brand } from '../src/theme/tokens';
import { useCadence, formatClock } from '../src/state/CadenceContext';
import { useI18n } from '../src/i18n/I18nContext';

export default function Plan() {
  const { c, isDark } = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const { plan, startWorkout, addPhase, removePhase, updatePhase } = useCadence();

  const totalSec = plan.reduce((a, p) => a + p.durationSec, 0);
  const avg = Math.round(plan.reduce((a, p) => a + p.bpm * p.durationSec, 0) / totalSec);
  const activeIdx = 1; // 巡航 highlighted in the design

  const onStart = () => {
    startWorkout();
    router.push('/running');
  };

  return (
    <Screen>
      <SubHeader title={t('plan.title')} subtitle={t('plan.subtitle')} />

      <ScrollView contentContainerStyle={{ padding: 18, paddingTop: 20 }} showsVerticalScrollIndicator={false}>
        {plan.map((p, i) => {
          const active = i === activeIdx;
          return (
            <View key={p.id}>
              <Pressable
                onLongPress={() => removePhase(p.id)}
                delayLongPress={400}
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
                <View style={styles.phaseTop}>
                  <View style={[styles.bar, { backgroundColor: p.color }]} />
                  <View style={{ flex: 1 }}>
                    <TextInput
                      value={p.name}
                      onChangeText={(text) => updatePhase(p.id, { name: text })}
                      placeholder={t('plan.placeholder')}
                      placeholderTextColor={c.textFaint}
                      maxLength={12}
                      style={[styles.phaseName, styles.phaseNameInput, { color: c.text, borderBottomColor: c.divider }]}
                    />
                    <Text style={[styles.phaseTime, { color: c.textFaint }]}>{formatClock(p.durationSec)}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.phaseBpm, { color: c.text }]}>{p.bpm}</Text>
                    <Text style={[styles.phaseUnit, { color: c.textFaint }]}>SPM</Text>
                  </View>
                </View>

                <View style={[styles.phaseControls, { borderTopColor: c.divider }]}>
                  <MiniStepper
                    value={formatClock(p.durationSec)}
                    caption={t('plan.duration')}
                    onStep={(d) => updatePhase(p.id, { durationSec: p.durationSec + d * 30 })}
                  />
                  <MiniStepper
                    value={String(p.bpm)}
                    caption={t('plan.cadence')}
                    onStep={(d) => updatePhase(p.id, { bpm: p.bpm + d })}
                  />
                </View>
              </Pressable>

              {i < plan.length - 1 && (() => {
                const delta = plan[i + 1].bpm - p.bpm;
                const label =
                  delta > 0 ? t('plan.connectorUp', { delta })
                  : delta < 0 ? t('plan.connectorDown', { delta: -delta })
                  : t('plan.connectorFlat');
                return (
                  <View style={styles.connector}>
                    <View style={[styles.connectorLine, { backgroundColor: c.trackInactive }]} />
                    <View style={[styles.connectorPill, { backgroundColor: isDark ? 'rgba(255,140,43,0.18)' : '#FFEAD6' }]}>
                      <Text style={{ fontFamily: fonts.bodyBold, fontSize: 11, color: c.brandText }}>
                        {label}
                      </Text>
                    </View>
                  </View>
                );
              })()}
            </View>
          );
        })}

        <Pressable
          onPress={addPhase}
          style={({ pressed }) => [
            styles.addPhase,
            { borderColor: isDark ? '#3A3328' : '#D8D1C6', opacity: pressed ? 0.6 : 1 },
          ]}
        >
          <Text style={{ fontFamily: fonts.bodyBold, fontSize: 14, color: c.textFaint }}>{t('plan.addPhase')}</Text>
        </Pressable>

        {plan.length > 1 && (
          <Text style={[styles.deleteHint, { color: c.textFaint }]}>{t('plan.deleteHint')}</Text>
        )}
      </ScrollView>

      <View style={{ paddingHorizontal: 16 }}>
        <View style={styles.summary}>
          <Text style={[styles.summaryText, { color: c.textFaint }]}>
            {t('plan.totalDuration', { duration: formatClock(totalSec) })}
          </Text>
          <Text style={[styles.summaryText, { color: c.textFaint }]}>{t('plan.average', { avg })}</Text>
        </View>
        <Pressable onPress={onStart}>
          <LinearGradient
            colors={[brand.glow, brand.deep]}
            start={{ x: 0.15, y: 0 }}
            end={{ x: 0.85, y: 1 }}
            style={styles.startBtn}
          >
            <View style={styles.startTri} />
            <Text style={styles.startText}>{t('plan.start')}</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  phase: {
    paddingVertical: 15,
    paddingHorizontal: 16,
    borderRadius: 20,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 14,
    elevation: 2,
  },
  phaseTop: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  phaseControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 13,
    paddingTop: 13,
    borderTopWidth: 1,
  },
  bar: { width: 10, height: 46, borderRadius: 6 },
  phaseName: { fontFamily: fonts.bodyBold, fontSize: 17 },
  phaseNameInput: { padding: 0, alignSelf: 'flex-start', borderBottomWidth: 1, paddingBottom: 2, minWidth: 80 },
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
  deleteHint: { fontFamily: fonts.bodyMedium, fontSize: 12, textAlign: 'center', marginTop: 10 },
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
