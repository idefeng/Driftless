import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen } from '../src/components/Screen';
import { SubHeader } from '../src/components/SubHeader';
import { MiniStepper } from '../src/components/MiniStepper';
import { Segmented, Toggle } from '../src/components/ui';
import { useTheme } from '../src/theme/ThemeContext';
import { fonts, brand } from '../src/theme/tokens';
import { useCadence, formatClock, RAMP_OPTIONS } from '../src/state/CadenceContext';
import { useI18n } from '../src/i18n/I18nContext';
import { PlanShareModal } from '../src/components/PlanShareModal';

// Keeps the plan name short enough that the Home chip never has to truncate it.
const PLAN_NAME_MAX_LENGTH = 6;

export default function Plan() {
  const { c, isDark } = useTheme();
  const { t, language } = useI18n();
  const router = useRouter();
  const {
    plans, activePlanId, renamePlan, plan, startWorkout, addPhase, removePhase, updatePhase,
    rampSec, setRampSec, phaseCue, setPhaseCue,
  } = useCadence();
  const activePlan = plans.find((p) => p.id === activePlanId) ?? plans[0];

  const [shareVisible, setShareVisible] = useState(false);

  const totalSec = plan.reduce((a, p) => a + p.durationSec, 0);
  const avg = Math.round(plan.reduce((a, p) => a + p.bpm * p.durationSec, 0) / (totalSec || 1));

  const onStart = () => {
    startWorkout();
    router.push('/running');
  };

  return (
    <Screen>
      <SubHeader title={t('plan.title')} subtitle={t('plan.subtitle')} />

      <ScrollView contentContainerStyle={{ padding: 18, paddingTop: 20 }} showsVerticalScrollIndicator={false}>
        <View style={styles.nameHeaderRow}>
          <TextInput
            value={activePlan.name}
            onChangeText={(text) => renamePlan(activePlan.id, text)}
            placeholder={t('plan.namePlaceholder')}
            placeholderTextColor={c.textFaint}
            maxLength={PLAN_NAME_MAX_LENGTH}
            style={[styles.planName, { color: c.text, borderBottomColor: c.divider }]}
          />
          <Pressable
            style={[styles.shareBadge, { backgroundColor: c.chipAccent }]}
            onPress={() => setShareVisible(true)}
          >
            <Text style={[styles.shareText, { color: c.brandText }]}>
              {language === 'zh' ? 'QR 导出' : 'Export'}
            </Text>
          </Pressable>
        </View>

        <Text
          style={[
            styles.planNameCounter,
            { color: activePlan.name.length >= PLAN_NAME_MAX_LENGTH ? c.brandText : c.textFaint },
          ]}
        >
          {t('plan.nameCounter', { count: activePlan.name.length, max: PLAN_NAME_MAX_LENGTH })}
        </Text>

        {plan.map((p, i) => {
          return (
            <View key={p.id}>
              <Pressable
                onLongPress={() => removePhase(p.id)}
                delayLongPress={400}
                accessibilityRole="button"
                accessibilityLabel={p.name}
                style={[
                  styles.phase,
                  {
                    backgroundColor: c.card,
                    borderColor: 'transparent',
                    borderWidth: 2,
                    shadowOpacity: isDark ? 0 : 0.05,
                    shadowColor: '#000',
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
                    <View style={[styles.connectorPill, { backgroundColor: c.chipAccent }]}>
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
          accessibilityRole="button"
          accessibilityLabel={t('plan.addPhase')}
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

        <Text style={[styles.sectionTitle, { color: c.textFaint }]}>{t('plan.transitionTitle')}</Text>
        <View style={[styles.transitionCard, { backgroundColor: c.card, shadowOpacity: isDark ? 0 : 0.05 }]}>
          <Text style={[styles.optTitle, { color: c.text }]}>{t('plan.rampTitle')}</Text>
          <Text style={[styles.optSub, { color: c.textFaint }]}>{t('plan.rampSubtitle')}</Text>
          <Segmented
            label={t('plan.rampTitle')}
            value={rampSec}
            onChange={setRampSec}
            options={RAMP_OPTIONS.map((n) => ({
              value: n,
              label: n === 0 ? t('plan.rampOff') : t('plan.rampSec', { n }),
            }))}
          />
          <View style={[styles.cueRow, { borderTopColor: c.divider }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.optTitle, { color: c.text }]}>{t('plan.cueTitle')}</Text>
              <Text style={[styles.optSub, { color: c.textFaint, marginBottom: 0 }]}>{t('plan.cueSubtitle')}</Text>
            </View>
            <Toggle value={phaseCue} onChange={setPhaseCue} label={t('plan.cueTitle')} />
          </View>
        </View>
      </ScrollView>

      <View style={{ paddingHorizontal: 16 }}>
        <View style={styles.summary}>
          <Text style={[styles.summaryText, { color: c.textFaint }]}>
            {t('plan.totalDuration', { duration: formatClock(totalSec) })}
          </Text>
          <Text style={[styles.summaryText, { color: c.textFaint }]}>{t('plan.average', { avg })}</Text>
        </View>
        <Pressable onPress={onStart} accessibilityRole="button" accessibilityLabel={t('plan.start')}>
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

      <PlanShareModal
        plan={activePlan}
        visible={shareVisible}
        onClose={() => setShareVisible(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  nameHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  planName: {
    flex: 1,
    fontFamily: fonts.displayBold,
    fontSize: 22,
    borderBottomWidth: 1,
    paddingBottom: 6,
  },
  shareBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  shareText: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
  },
  planNameCounter: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11.5,
    textAlign: 'right',
    marginTop: 4,
    marginBottom: 16,
  },
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
  sectionTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    letterSpacing: 1,
    marginTop: 24,
    marginBottom: 8,
    paddingLeft: 4,
  },
  transitionCard: {
    padding: 16,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 14,
    elevation: 2,
  },
  optTitle: { fontFamily: fonts.bodyBold, fontSize: 15.5 },
  optSub: { fontFamily: fonts.bodyMedium, fontSize: 12, marginTop: 2, marginBottom: 12 },
  cueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
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
    borderLeftColor: brand.ink,
  },
  startText: { fontFamily: fonts.displayBold, fontSize: 18, color: brand.ink },
});
