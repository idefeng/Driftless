import React, { useCallback, useRef } from 'react';
import { Pressable, Text, View, StyleSheet } from 'react-native';
import { brand, fonts } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';

/**
 * Compact −/＋ stepper for inline editing (e.g. a plan phase's cadence or
 * duration). Tap = one step; press-and-hold = continuous, accelerating steps —
 * the small-card cousin of {@link StepButton}.
 */

interface MiniStepperProps {
  value: string; // formatted center value, e.g. "180" or "5:00"
  caption: string; // label under the value, e.g. "步频" / "时长"
  onStep: (delta: number) => void;
}

function HoldButton({ sign, onStep }: { sign: '+' | '−'; onStep: (d: number) => void }) {
  const { c, isDark } = useTheme();
  const delta = sign === '+' ? 1 : -1;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalMs = useRef(260);
  const held = useRef(false);

  const clear = useCallback(() => {
    held.current = false;
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    intervalMs.current = 260;
  }, []);

  const repeat = useCallback(() => {
    if (!held.current) return;
    onStep(delta);
    intervalMs.current = Math.max(45, intervalMs.current * 0.82);
    timer.current = setTimeout(repeat, intervalMs.current);
  }, [delta, onStep]);

  const onPressIn = useCallback(() => {
    held.current = true;
    onStep(delta); // immediate single step
    timer.current = setTimeout(repeat, 360); // hold delay before continuous
  }, [delta, onStep, repeat]);

  return (
    <Pressable
      onPressIn={onPressIn}
      onPressOut={clear}
      hitSlop={6}
      style={({ pressed }) => [
        styles.btn,
        {
          backgroundColor: isDark ? 'rgba(255,154,69,0.14)' : '#FFEAD6',
          opacity: pressed ? 0.6 : 1,
        },
      ]}
    >
      <Text style={[styles.sign, { color: c.brandText }]}>{sign}</Text>
    </Pressable>
  );
}

export function MiniStepper({ value, caption, onStep }: MiniStepperProps) {
  const { c } = useTheme();
  return (
    <View style={styles.row}>
      <HoldButton sign="−" onStep={onStep} />
      <View style={styles.center}>
        <Text style={[styles.value, { color: c.text }]}>{value}</Text>
        <Text style={[styles.caption, { color: c.textFaint }]}>{caption}</Text>
      </View>
      <HoldButton sign="+" onStep={onStep} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  btn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sign: { fontFamily: fonts.displaySemiBold, fontSize: 20, lineHeight: 24, marginTop: -2 },
  center: { minWidth: 52, alignItems: 'center' },
  value: { fontFamily: fonts.bodyBold, fontSize: 15, fontVariant: ['tabular-nums'] },
  caption: { fontFamily: fonts.bodySemiBold, fontSize: 10, letterSpacing: 0.5 },
});
