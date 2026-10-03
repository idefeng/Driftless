import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '../src/components/Screen';
import { BeatBars } from '../src/components/BeatBars';
import { PlayPauseButton } from '../src/components/PlayPauseButton';
import { StepButton } from '../src/components/StepButton';
import { Wordmark } from '../src/components/Logo';
import { Chip, RoundIconButton, MenuIcon, SettingsIcon, MiniBars, dot } from '../src/components/ui';
import { useTheme } from '../src/theme/ThemeContext';
import { fonts } from '../src/theme/tokens';
import { useCadence, SOUNDS } from '../src/state/CadenceContext';
import { useI18n } from '../src/i18n/I18nContext';
import { getSoundShortName } from '../src/i18n/labels';
import { getBpmThermalColor } from '../src/theme/thermalColor';
import { TapTempoModal } from '../src/components/TapTempoModal';
import { PaceCalculatorModal } from '../src/components/PaceCalculatorModal';

export default function Home() {
  const { c, isDark } = useTheme();
  const { t, language } = useI18n();
  const router = useRouter();
  const { bpm, isPlaying, sound, coexist, plans, activePlanId, setActivePlanId, step, togglePlay, setSound, setCoexist } =
    useCadence();

  const [showTapTempo, setShowTapTempo] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);

  // Dynamic Thermal Color for BPM
  const thermal = getBpmThermalColor(bpm, isDark);
  const thermalLabel = language === 'zh' ? thermal.labelZh : thermal.labelEn;

  const cycleSound = () => {
    const i = SOUNDS.findIndex((s) => s.id === sound);
    setSound(SOUNDS[(i + 1) % SOUNDS.length].id);
  };

  const toggleCoexist = () => setCoexist(coexist === 'mix' ? 'exclusive' : 'mix');

  const activePlan = plans.find((p) => p.id === activePlanId) ?? plans[0];
  const cyclePlan = () => {
    const i = plans.findIndex((p) => p.id === activePlanId);
    setActivePlanId(plans[(i + 1) % plans.length].id);
  };

  return (
    <Screen>
      {/* Header */}
      <View style={styles.header}>
        <Wordmark size={17} />
        <RoundIconButton onPress={() => router.push('/settings')} label={t('a11y.settings')}>
          <SettingsIcon />
        </RoundIconButton>
      </View>

      {/* Center: BPM + thermal badge + beat + chips + play */}
      <View style={styles.center}>
        <View style={styles.kickerRow}>
          <Text style={[styles.kicker, { color: c.textFaint }]}>{t('home.currentCadence')}</Text>
          <View style={[styles.thermalBadge, { backgroundColor: thermal.chipBg }]}>
            <Text style={[styles.thermalText, { color: thermal.base }]}>{thermalLabel}</Text>
          </View>
        </View>

        <Text style={[styles.bpm, { color: c.textStrong }]}>{bpm}</Text>

        <View style={{ marginTop: 18 }}>
          <BeatBars
            color={thermal.base}
            centerColor={thermal.glow}
            height={52}
            running={isPlaying}
            showHalo
          />
        </View>

        <View style={styles.chips}>
          <Pressable
            onPress={cycleSound}
            onLongPress={() => router.push('/sounds')}
            delayLongPress={300}
            accessibilityRole="button"
            accessibilityLabel={t('a11y.soundChip', { sound: getSoundShortName(t, sound) })}
          >
            <Chip style={styles.compactChip}>
              <MiniBars color={c.textFaint} heights={[6, 13, 9]} />
              <Text style={[styles.chipText, { color: c.text }]}>{getSoundShortName(t, sound)}</Text>
            </Chip>
          </Pressable>
          <Pressable
            onPress={toggleCoexist}
            onLongPress={() => router.push('/coexist')}
            delayLongPress={300}
            accessibilityRole="button"
            accessibilityLabel={t('a11y.coexistChip', {
              mode: coexist === 'mix' ? t('home.coexistMix') : t('home.coexistExclusive'),
            })}
          >
            <Chip accent style={styles.compactChip}>
              {dot(thermal.base)}
              <Text style={[styles.chipText, { color: c.brandText }]}>
                {coexist === 'mix' ? t('home.coexistMix') : t('home.coexistExclusive')}
              </Text>
            </Chip>
          </Pressable>
          <Pressable
            onPress={cyclePlan}
            onLongPress={() => router.push('/plan')}
            delayLongPress={300}
            accessibilityRole="button"
            accessibilityLabel={t('a11y.planChip', { name: activePlan.name })}
          >
            <Chip style={styles.compactChip}>
              <MenuIcon />
              <Text style={[styles.chipText, styles.planChipText, { color: c.text }]} numberOfLines={1}>
                {activePlan.name}
              </Text>
            </Chip>
          </Pressable>
        </View>

        {/* Tools row: Tap Tempo & Pace Calculator */}
        <View style={styles.toolsRow}>
          <Pressable onPress={() => setShowTapTempo(true)}>
            <View style={[styles.toolChip, { backgroundColor: c.cardAlt }]}>
              <Text style={[styles.toolText, { color: c.textMuted }]}>
                {language === 'zh' ? '⏱ 踩拍测频' : '⏱ Tap Tempo'}
              </Text>
            </View>
          </Pressable>
          <Pressable onPress={() => setShowCalculator(true)}>
            <View style={[styles.toolChip, { backgroundColor: c.cardAlt }]}>
              <Text style={[styles.toolText, { color: c.textMuted }]}>
                {language === 'zh' ? '⚡ 配速推算' : '⚡ Pace Calculator'}
              </Text>
            </View>
          </Pressable>
        </View>

        <View style={{ marginTop: 20 }}>
          <PlayPauseButton playing={isPlaying} onPress={togglePlay} />
        </View>
      </View>

      {/* Bottom: 1/4-screen blind-op ±1 buttons */}
      <View style={styles.steps}>
        <StepButton sign="−" label={t('home.slowDown')} onStep={() => step(-1)} />
        <StepButton sign="+" label={t('home.speedUp')} onStep={() => step(1)} />
      </View>

      {/* Modals */}
      <TapTempoModal visible={showTapTempo} onClose={() => setShowTapTempo(false)} />
      <PaceCalculatorModal visible={showCalculator} onClose={() => setShowCalculator(false)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 6,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  kickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  kicker: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
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
    fontSize: 138,
    lineHeight: 138 * 0.92,
    letterSpacing: -6,
    marginTop: 6,
    fontVariant: ['tabular-nums'],
    includeFontPadding: false,
  },
  chips: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 7,
    marginTop: 20,
  },
  compactChip: {
    paddingHorizontal: 12,
    gap: 6,
  },
  chipText: {
    fontFamily: fonts.bodyBold,
    fontSize: 12.5,
  },
  planChipText: {
    maxWidth: 72,
  },
  toolsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  toolChip: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 100,
  },
  toolText: {
    fontFamily: fonts.bodyBold,
    fontSize: 11.5,
  },
  steps: {
    flexDirection: 'row',
    gap: 14,
    paddingHorizontal: 16,
  },
});
