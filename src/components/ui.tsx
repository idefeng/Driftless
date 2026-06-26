import React from 'react';
import { View, Text, Pressable, StyleSheet, ViewStyle } from 'react-native';
import Svg, { Path, Line, Circle } from 'react-native-svg';
import { fonts, brand, systemGreen } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';

// ── Chip (rounded pill) ────────────────────────────────────────────────
export function Chip({
  children,
  accent = false,
  style,
}: {
  children: React.ReactNode;
  accent?: boolean;
  style?: ViewStyle;
}) {
  const { c } = useTheme();
  return (
    <View
      style={[
        styles.chip,
        {
          backgroundColor: accent ? c.chipAccent : c.chipNeutral,
          shadowOpacity: accent || c.scheme === 'dark' ? 0 : 0.05,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

// ── Toggle switch ──────────────────────────────────────────────────────
export function Toggle({ value, onChange }: { value: boolean; onChange?: (v: boolean) => void }) {
  const { c } = useTheme();
  return (
    <Pressable onPress={() => onChange?.(!value)} hitSlop={8}>
      <View
        style={[
          styles.track,
          { backgroundColor: value ? systemGreen : c.scheme === 'dark' ? '#3A3328' : '#E2DDD5' },
        ]}
      >
        <View style={[styles.knob, value ? { right: 2 } : { left: 2 }]} />
      </View>
    </Pressable>
  );
}

// ── Circular icon button (header back / menu) ──────────────────────────
export function RoundIconButton({
  onPress,
  children,
  size = 38,
}: {
  onPress?: () => void;
  children: React.ReactNode;
  size?: number;
}) {
  const { c, isDark } = useTheme();
  return (
    <Pressable onPress={onPress} hitSlop={8}>
      <View
        style={[
          styles.roundBtn,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: isDark ? c.cardAlt : '#fff',
            shadowOpacity: isDark ? 0 : 0.06,
          },
        ]}
      >
        {children}
      </View>
    </Pressable>
  );
}

export function BackIcon() {
  const { c } = useTheme();
  return (
    <Svg width={11} height={18} viewBox="0 0 11 18" fill="none">
      <Path
        d="M9 2L2 9l7 7"
        stroke={c.text}
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function MenuIcon() {
  const { c } = useTheme();
  const dot = c.scheme === 'dark' ? '#221E16' : '#fff';
  return (
    <Svg width={20} height={20} viewBox="0 0 22 22" fill="none" stroke={c.textFaint} strokeWidth={2} strokeLinecap="round">
      <Line x1={3} y1={7} x2={19} y2={7} />
      <Line x1={3} y1={15} x2={19} y2={15} />
      <Circle cx={14.5} cy={7} r={2.6} fill={dot} />
      <Circle cx={7.5} cy={15} r={2.6} fill={dot} />
    </Svg>
  );
}

export function CheckIcon({ color = '#fff', size = 17 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={(size * 13) / 17} viewBox="0 0 17 13" fill="none">
      <Path d="M2 6.5L6.5 11 15 2" stroke={color} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// ── Small static equalizer glyph (sound-effect avatar) ─────────────────
export function MiniBars({ color, heights = [10, 20, 14] }: { color: string; heights?: number[] }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 3 }}>
      {heights.map((h, i) => (
        <View key={i} style={{ width: 3.5, height: h, borderRadius: 2, backgroundColor: color }} />
      ))}
    </View>
  );
}

// ── Section heading text ───────────────────────────────────────────────
export function ScreenTitle({ children }: { children: React.ReactNode }) {
  const { c } = useTheme();
  return (
    <Text style={{ fontFamily: fonts.displayBold, fontSize: 26, letterSpacing: -0.6, color: c.text }}>
      {children}
    </Text>
  );
}

export const dot = (color: string, size = 7) => (
  <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }} />
);

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 15,
    paddingVertical: 9,
    borderRadius: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 1,
  },
  track: {
    width: 51,
    height: 31,
    borderRadius: 100,
    justifyContent: 'center',
  },
  knob: {
    position: 'absolute',
    width: 27,
    height: 27,
    borderRadius: 27 / 2,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  roundBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 1,
  },
});

export { brand };
