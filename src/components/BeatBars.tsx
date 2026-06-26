import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
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
 * BeatBars — Driftless's signature "跟拍跳动的脉冲波形": equidistant bars that
 * scale on the Y axis in a staggered wave. Precise & rhythmic, never random.
 * Mirrors the `beatBar` keyframe from the design prototype.
 */

interface BeatBarsProps {
  barWidth?: number;
  height?: number;
  gap?: number;
  /** symmetric stagger pattern; length = bar count. */
  delays?: number[];
  color: string;
  centerColor?: string;
  periodMs?: number;
  running?: boolean;
  radius?: number;
}

const DEFAULT_DELAYS = [0, 0.1, 0.2, 0.3, 0.2, 0.1, 0];

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
    // 0 → scaleY .32 / opacity .4 ; 1 → scaleY 1 / opacity 1
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
  periodMs = 1050,
  running = true,
  radius = 4,
}: BeatBarsProps) {
  const center = Math.floor(delays.length / 2);
  return (
    <View style={[styles.row, { height, gap }]}>
      {delays.map((d, i) => (
        <Bar
          key={i}
          delay={d}
          periodMs={periodMs}
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
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
