import React from 'react';
import { View, Text, Pressable, StyleSheet, ViewStyle } from 'react-native';
import Svg, { Path, Line, Circle } from 'react-native-svg';
import { fonts, brand } from '../theme/tokens';
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
export function Toggle({
  value,
  onChange,
  label,
}: {
  value: boolean;
  onChange?: (v: boolean) => void;
  label?: string;
}) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={() => onChange?.(!value)}
      hitSlop={8}
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value }}
    >
      <View
        style={[
          styles.track,
          { backgroundColor: value ? c.brand : c.trackInactive },
        ]}
      >
        <View style={[styles.knob, value ? { right: 2, backgroundColor: c.onBrand } : { left: 2 }]} />
      </View>
    </Pressable>
  );
}

// ── Segmented picker (small option sets: accent, ramp length…) ─────────
export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  label?: string;
}) {
  const { c } = useTheme();
  return (
    <View style={[styles.segmentRow, { backgroundColor: c.cardAlt }]} accessibilityRole="radiogroup" accessibilityLabel={label}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={String(o.value)}
            onPress={() => onChange(o.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            accessibilityLabel={o.label}
            style={[
              styles.segmentBtn,
              active && { backgroundColor: c.chipAccent, borderColor: c.brand },
            ]}
          >
            <Text style={{ fontFamily: fonts.bodyBold, fontSize: 13, color: active ? c.brandText : c.textMuted }}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ── Circular icon button (header back / menu) ──────────────────────────
export function RoundIconButton({
  onPress,
  children,
  size = 38,
  label,
}: {
  onPress?: () => void;
  children: React.ReactNode;
  size?: number;
  label?: string;
}) {
  const { c, isDark } = useTheme();
  return (
    <Pressable onPress={onPress} hitSlop={8} accessibilityRole="button" accessibilityLabel={label}>
      {({ pressed }) => (
        <View
          style={[
            styles.roundBtn,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: pressed ? c.buttonSurfacePressed : c.buttonSurface,
              borderWidth: 1,
              borderColor: c.buttonBorder,
              shadowOpacity: isDark ? 0 : 0.06,
              transform: [{ scale: pressed ? 0.94 : 1 }],
            },
          ]}
        >
          {children}
        </View>
      )}
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

export function ChevronRightIcon() {
  const { c } = useTheme();
  return (
    <Svg width={9} height={15} viewBox="0 0 9 15" fill="none">
      <Path
        d="M1 1l6 6.5L1 14"
        stroke={c.textFaint}
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// 齿轮外轮廓：8 个梯形齿（齿顶窄、齿根宽），齿间用齿根圆弧连接，一笔闭合。
// 旧版是放射短线 + 圆，看起来像太阳（容易误认成「日光模式」开关）。
const GEAR_PATH = (() => {
  const cx = 12;
  const cy = 12;
  const rOut = 10;
  const rIn = 7.4;
  const teeth = 8;
  const step = (Math.PI * 2) / teeth;
  const tipHalf = step * 0.17; // 齿顶半宽（弧度）
  const rootHalf = step * 0.27; // 齿根半宽
  const pt = (r: number, a: number) => `${(cx + Math.cos(a) * r).toFixed(2)} ${(cy + Math.sin(a) * r).toFixed(2)}`;
  let d = '';
  for (let i = 0; i < teeth; i++) {
    const a = i * step - Math.PI / 2;
    d += `${i === 0 ? 'M' : 'L'}${pt(rIn, a - rootHalf)} L${pt(rOut, a - tipHalf)} L${pt(rOut, a + tipHalf)} L${pt(rIn, a + rootHalf)} `;
    // 齿根圆弧到下一个齿
    d += `A${rIn} ${rIn} 0 0 1 ${pt(rIn, a + step - rootHalf)} `;
  }
  return `${d}Z`;
})();

export function SettingsIcon() {
  const { c } = useTheme();
  return (
    <Svg width={21} height={21} viewBox="0 0 24 24" fill="none">
      <Path d={GEAR_PATH} stroke={c.text} strokeWidth={1.9} strokeLinejoin="round" />
      <Circle cx={12} cy={12} r={3} stroke={c.text} strokeWidth={1.9} />
    </Svg>
  );
}

// ── Stopwatch glyph (pre-run tools entry) ──────────────────────────────
export function ToolsIcon({ color }: { color?: string }) {
  const { c } = useTheme();
  // 与返回键一致用主文字色；textFaint 在暗黑模式下对比度太低，不像可点按钮。
  const stroke = color ?? c.text;
  return (
    <Svg width={20} height={20} viewBox="0 0 22 22" fill="none" stroke={stroke} strokeWidth={2} strokeLinecap="round">
      <Circle cx={11} cy={12.5} r={7} />
      <Line x1={11} y1={12.5} x2={11} y2={8.5} />
      <Line x1={8.5} y1={2.5} x2={13.5} y2={2.5} />
      <Line x1={17} y1={6} x2={18.5} y2={4.5} />
    </Svg>
  );
}

export function CheckIcon({ color = brand.ink, size = 17 }: { color?: string; size?: number }) {
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
  segmentRow: {
    flexDirection: 'row',
    gap: 4,
    padding: 4,
    borderRadius: 14,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 11,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
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
