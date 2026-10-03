import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useCadence } from '../state/CadenceContext';
import { Footprint, FOOT_H, FOOT_W } from './Footprint';

/**
 * FootstepPulse — 首页 / 跑步页的节拍可视化：一拍一步，左右脚交替「落地」。
 * 落地瞬间点亮并轻微弹起，随后在一拍内衰减到暗态；另一只脚接着落下。
 * 周期跟随当前 BPM（两拍一个循环），与原 BeatBars 一样只做视觉同步。
 */

interface FootstepPulseProps {
  color: string;
  glowColor?: string;
  /** footprint height in px */
  size?: number;
  running?: boolean;
  /** 一拍的毫秒数；缺省时跟随当前 BPM。 */
  periodMs?: number;
}

const IDLE_OPACITY = 0.9;
const DIM_OPACITY = 0.3;
// Fraction of a beat a landed foot stays fully lit before fading.
const HOLD = 0.35;

function Foot({
  side,
  progress,
  running,
  color,
  glowColor,
  size,
}: {
  side: 'left' | 'right';
  progress: SharedValue<number>;
  running: boolean;
  color: string;
  glowColor: string;
  size: number;
}) {
  // Left lands at progress 0, right at 0.5 (one beat later). `age` = beats since this foot landed.
  const offset = side === 'left' ? 0 : 0.5;

  const footStyle = useAnimatedStyle(() => {
    if (!running) return { opacity: IDLE_OPACITY, transform: [{ scale: 1 }] };
    const age = (((progress.value - offset) % 1) + 1) % 1 * 2;
    // Hold full brightness briefly after landing, then fade to dim by the next beat.
    const fadeT = Math.min(1, Math.max(0, (age - HOLD) / (1 - HOLD)));
    const intensity = 1 - (1 - DIM_OPACITY) * fadeT;
    const pop = Math.max(0, 1 - age * 4);
    return { opacity: intensity, transform: [{ scale: 1 + 0.1 * pop }] };
  });

  const glowStyle = useAnimatedStyle(() => {
    if (!running) return { opacity: 0, transform: [{ scale: 0.8 }] };
    const age = (((progress.value - offset) % 1) + 1) % 1 * 2;
    const fade = Math.max(0, 1 - age);
    return { opacity: 0.32 * fade, transform: [{ scale: 0.8 + 0.5 * (1 - fade) }] };
  });

  const w = (size * FOOT_W) / FOOT_H;
  return (
    <View style={[styles.foot, { width: w, height: size, marginTop: side === 'left' ? size * 0.22 : 0 }]}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.glow,
          { width: size * 0.95, height: size * 0.95, borderRadius: size, backgroundColor: glowColor },
          glowStyle,
        ]}
      />
      <Animated.View style={footStyle}>
        <Footprint side={side} color={color} height={size} />
      </Animated.View>
    </View>
  );
}

export function FootstepPulse({ color, glowColor, size = 56, running = true, periodMs }: FootstepPulseProps) {
  const { bpm } = useCadence();
  const beatMs = periodMs ?? Math.round(60000 / bpm);
  const progress = useSharedValue(0);

  useEffect(() => {
    cancelAnimation(progress);
    if (running) {
      progress.value = 0;
      progress.value = withRepeat(withTiming(1, { duration: beatMs * 2, easing: Easing.linear }), -1, false);
    } else {
      progress.value = 0;
    }
    return () => cancelAnimation(progress);
  }, [beatMs, running, progress]);

  return (
    <View style={[styles.row, { height: size * 1.22, gap: size * 0.32 }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Foot side="left" progress={progress} running={running} color={color} glowColor={glowColor ?? color} size={size} />
      <Foot side="right" progress={progress} running={running} color={color} glowColor={glowColor ?? color} size={size} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  foot: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
  },
});
