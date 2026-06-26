import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '../src/components/Screen';
import { BeatBars } from '../src/components/BeatBars';
import { PlayPauseButton } from '../src/components/PlayPauseButton';
import { StepButton } from '../src/components/StepButton';
import { Wordmark } from '../src/components/Logo';
import { Chip, MenuIcon, MiniBars, dot } from '../src/components/ui';
import { useTheme } from '../src/theme/ThemeContext';
import { fonts, brand } from '../src/theme/tokens';
import { useCadence, SOUND_NAME, SOUNDS } from '../src/state/CadenceContext';

export default function Home() {
  const { c, isDark } = useTheme();
  const router = useRouter();
  const { bpm, isPlaying, sound, coexist, step, togglePlay, setSound, setCoexist } = useCadence();

  // Tap the sound chip to quick-cycle to the next timbre; long-press for the
  // full picker with descriptions.
  const cycleSound = () => {
    const i = SOUNDS.findIndex((s) => s.id === sound);
    setSound(SOUNDS[(i + 1) % SOUNDS.length].id);
  };

  // Tap the mode chip to toggle coexist ⇄ exclusive; long-press for the full
  // coexist settings page.
  const toggleCoexist = () => setCoexist(coexist === 'mix' ? 'exclusive' : 'mix');

  return (
    <Screen>
      {/* Header */}
      <View style={styles.header}>
        <Wordmark size={17} />
      </View>

      {/* Center: BPM + beat + chips + play */}
      <View style={styles.center}>
        <Text style={[styles.kicker, { color: c.textFaint }]}>当前步频 · SPM</Text>
        <Text style={[styles.bpm, { color: c.textStrong }]}>{bpm}</Text>

        <View style={{ marginTop: 22 }}>
          <BeatBars
            color={isDark ? brand.glow : brand.base}
            centerColor={isDark ? brand.light : brand.deep}
            height={50}
            running={isPlaying}
          />
        </View>

        <View style={styles.chips}>
          <Pressable onPress={cycleSound} onLongPress={() => router.push('/sounds')} delayLongPress={300}>
            <Chip style={styles.compactChip}>
              <MiniBars color={c.textFaint} heights={[6, 13, 9]} />
              <Text style={[styles.chipText, { color: c.text }]}>{SOUND_NAME[sound]}</Text>
            </Chip>
          </Pressable>
          <Pressable onPress={toggleCoexist} onLongPress={() => router.push('/coexist')} delayLongPress={300}>
            <Chip accent style={styles.compactChip}>
              {dot(isDark ? brand.glow : brand.deep)}
              <Text style={[styles.chipText, { color: c.brandText }]}>
                {coexist === 'mix' ? '共存' : '独占'}
              </Text>
            </Chip>
          </Pressable>
          <Pressable onPress={() => router.push('/plan')}>
            <Chip style={styles.compactChip}>
              <MenuIcon />
              <Text style={[styles.chipText, { color: c.text }]}>训练计划</Text>
            </Chip>
          </Pressable>
        </View>

        <View style={{ marginTop: 30 }}>
          <PlayPauseButton playing={isPlaying} onPress={togglePlay} />
        </View>
      </View>

      {/* Bottom: 1/4-screen blind-op ±1 buttons */}
      <View style={styles.steps}>
        <StepButton sign="−" label="减速 −1" onStep={() => step(-1)} />
        <StepButton sign="+" label="加速 +1" onStep={() => step(1)} />
      </View>
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
  kicker: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    letterSpacing: 3,
    textTransform: 'uppercase',
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
    marginTop: 26,
  },
  // Compact override so all three chips stay on one line (no wrapping ever).
  compactChip: {
    paddingHorizontal: 12,
    gap: 6,
  },
  chipText: {
    fontFamily: fonts.bodyBold,
    fontSize: 12.5,
  },
  steps: {
    flexDirection: 'row',
    gap: 14,
    paddingHorizontal: 16,
  },
});
