import React, { useEffect } from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
  cancelAnimation,
} from 'react-native-reanimated';
import { brand } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';

interface PlayPauseButtonProps {
  playing: boolean;
  onPress: () => void;
  size?: number;
}

function Ring({ size, delay, playing }: { size: number; delay: number; playing: boolean }) {
  const t = useSharedValue(0);
  useEffect(() => {
    cancelAnimation(t);
    if (playing) {
      t.value = withDelay(
        delay,
        withRepeat(withTiming(1, { duration: 1500, easing: Easing.out(Easing.ease) }), -1, false),
      );
    } else {
      t.value = withTiming(0, { duration: 150 });
    }
    return () => cancelAnimation(t);
  }, [delay, playing, t]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: 0.8 + 1.15 * t.value }],
    opacity: (1 - t.value) * 0.5,
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.ring,
        { width: size, height: size, borderRadius: size / 2, borderColor: brand.base },
        style,
      ]}
    />
  );
}

export function PlayPauseButton({ playing, onPress, size = 88 }: PlayPauseButtonProps) {
  const { c } = useTheme();
  const barW = size * 0.09;
  const barH = size * 0.34;
  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Ring size={size} delay={0} playing={playing} />
      <Ring size={size} delay={750} playing={playing} />
      <Pressable onPress={onPress} hitSlop={10}>
        <LinearGradient
          colors={[brand.glow, brand.deep]}
          start={{ x: 0.15, y: 0 }}
          end={{ x: 0.85, y: 1 }}
          style={[
            styles.btn,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              shadowColor: brand.deep,
              shadowOpacity: c.scheme === 'dark' ? 0.55 : 0.4,
            },
          ]}
        >
          {playing ? (
            <View style={{ flexDirection: 'row', gap: size * 0.08 }}>
              <View style={{ width: barW, height: barH, borderRadius: barW / 2, backgroundColor: '#fff' }} />
              <View style={{ width: barW, height: barH, borderRadius: barW / 2, backgroundColor: '#fff' }} />
            </View>
          ) : (
            <View
              style={{
                marginLeft: size * 0.07,
                width: 0,
                height: 0,
                borderTopWidth: barH * 0.62,
                borderBottomWidth: barH * 0.62,
                borderLeftWidth: barH * 0.9,
                borderTopColor: 'transparent',
                borderBottomColor: 'transparent',
                borderLeftColor: '#fff',
              }}
            />
          )}
        </LinearGradient>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    borderWidth: 2,
  },
  btn: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 24,
    elevation: 8,
  },
});
