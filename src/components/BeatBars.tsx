import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useCadence } from '../state/CadenceContext';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
  cancelAnimation,
} from 'react-native-reanimated';

/**
 * BeatBars 2.0 — Driftless's signature "跟拍跳动的脉冲波形 + 真实流体光环涟漪":
 * Equidistant bars scaling on Y axis with background radial pulse aura.
 */

interface BeatBarsProps {
  barWidth?: number;
  height?: number;
  gap?: number;
  /** symmetric stagger pattern; length = bar count. */
  delays?: number[];
  color: string;
  centerColor?: string;
  /** 一个完整脉冲周期的毫秒数；缺省时跟随当前 BPM（60000/bpm）。 */
  periodMs?: number;
  running?: boolean;
  radius?: number;
  showHalo?: boolean;
}

const DEFAULT_DELAYS = [0, 0.1, 0.2, 0.3, 0.2, 0.1, 0];

function HaloPulse({
  periodMs,
  running,
  color,
}: {
  periodMs: number;
  running: boolean;
  color: string;
}) {
  const progress = useSharedValue(0);

  useEffect(() => {
    cancelAnimation(progress);
    if (running) {
      progress.value = 0;
      progress.value = withRepeat(
        withTiming(1, { duration: periodMs, easing: Easing.out(Easing.quad) }),
        -1,
        false,
      );
    } else {
      progress.value = 0;
    }
    return () => cancelAnimation(progress);
  }, [periodMs, running, progress]);

  const animatedStyle = useAnimatedStyle(() => {
    const scale = 0.8 + 0.6 * progress.value;
    const opacity = (1 - progress.value) * 0.45;
    return {
      transform: [{ scale }],
      opacity: running ? opacity : 0,
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.halo,
        {
          borderColor: color,
          backgroundColor: color,
        },
        animatedStyle,
      ]}
    />
  );
}

function Bar({
  delay,
  periodMs,
  running,
  style,
}: {
  delay: number;
  periodMs: number;
  running: boolean;
  style: object;
}) {
  const t = useSharedValue(running ? 0 : 1);

  useEffect(() => {
    cancelAnimation(t);
    if (running) {
      t.value = withDelay(
        delay * periodMs,
        withRepeat(
          withTiming(1, { duration: periodMs, easing: Easing.inOut(Easing.ease) }),
          -1,
          true,
        ),
      );
    } else {
      t.value = withTiming(0.5, { duration: 200 });
    }
    return () => cancelAnimation(t);
  }, [delay, periodMs, running, t]);

  const animatedStyle = useAnimatedStyle(() => {
    const scaleY = 0.32 + 0.68 * t.value;
    const opacity = 0.4 + 0.6 * t.value;
    return { transform: [{ scaleY }], opacity };
  });

  return <Animated.View style={[style, animatedStyle]} />;
}

export function BeatBars({
  barWidth = 7,
  height = 50,
  gap = 11,
  delays = DEFAULT_DELAYS,
  color,
  centerColor,
  periodMs,
  running = true,
  radius = 4,
  showHalo = true,
}: BeatBarsProps) {
  const { bpm } = useCadence();
  const period = periodMs ?? Math.round(60000 / bpm);
  const center = Math.floor(delays.length / 2);

  return (
    <View style={[styles.container, { height }]}>
      {showHalo && <HaloPulse periodMs={period} running={running} color={centerColor || color} />}
      <View style={[styles.row, { height, gap }]}>
        {delays.map((d, i) => (
          <Bar
            key={i}
            delay={d}
            periodMs={period}
            running={running}
            style={{
              width: barWidth,
              height,
              borderRadius: radius,
              backgroundColor: i === center && centerColor ? centerColor : color,
            }}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 2,
  },
  halo: {
    position: 'absolute',
    width: 140,
    height: 70,
    borderRadius: 35,
    borderWidth: 1.5,
    zIndex: 1,
  },
});
