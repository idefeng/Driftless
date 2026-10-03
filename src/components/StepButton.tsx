import React, { useCallback, useEffect, useRef } from 'react';
import { Pressable, Text, StyleSheet, View, useWindowDimensions } from 'react-native';
import { brand, fonts } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
import { useI18n } from '../i18n/I18nContext';

/**
 * StepButton — the 1/4-screen blind-operation ±1 control (PRD §3.3).
 * Long-press triggers continuous, accelerating stepping.
 */

interface StepButtonProps {
  sign: '+' | '−';
  label: string;
  hint?: string;
  onStep: (delta: number) => void;
  flex?: number;
  glyphSize?: number;
  height?: number;
}

export function StepButton({
  sign,
  label,
  hint,
  onStep,
  flex = 1,
  glyphSize = 84,
  height,
}: StepButtonProps) {
  const { c, isDark } = useTheme();
  const { t } = useI18n();
  const { height: windowHeight } = useWindowDimensions();
  // PRD §3.3:1/4 屏高的盲操按钮，带最小高度兜底，平板不再失真。
  const resolvedHeight = height ?? Math.max(180, Math.round(windowHeight * 0.25));
  const hintText = hint ?? t('step.holdToRepeat');
  const delta = sign === '+' ? 1 : -1;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalMs = useRef(260);
  const pressed = useRef(false);

  const clear = useCallback(() => {
    pressed.current = false;
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    intervalMs.current = 260;
  }, []);

  // 卸载时清掉长按连发计时器，避免泄漏。
  useEffect(() => clear, [clear]);

  const repeat = useCallback(() => {
    if (!pressed.current) return;
    onStep(delta);
    // accelerate toward a 45ms floor
    intervalMs.current = Math.max(45, intervalMs.current * 0.82);
    timer.current = setTimeout(repeat, intervalMs.current);
  }, [delta, onStep]);

  const onPressIn = useCallback(() => {
    pressed.current = true;
    onStep(delta); // immediate single step
    timer.current = setTimeout(repeat, 360); // hold delay before continuous
  }, [delta, onStep, repeat]);

  return (
    <Pressable
      onPressIn={onPressIn}
      onPressOut={clear}
      accessibilityRole="button"
      accessibilityLabel={sign === '+' ? t('a11y.stepUp') : t('a11y.stepDown')}
      accessibilityHint={hintText}
      style={({ pressed: isDown }) => [
        styles.btn,
        {
          flex,
          height: resolvedHeight,
          backgroundColor: c.card,
          borderColor: isDark ? 'rgba(198,255,61,0.22)' : 'rgba(94,158,0,0.28)',
          opacity: isDown ? 0.92 : 1,
          transform: [{ scale: isDown ? 0.985 : 1 }],
          shadowOpacity: isDark ? 0 : 0.06,
        },
      ]}
    >
      <Text
        style={{
          fontFamily: fonts.displaySemiBold,
          fontSize: glyphSize,
          lineHeight: glyphSize * 0.86,
          color: c.brandText,
          marginTop: -8,
        }}
      >
        {sign}
      </Text>
      <Text style={{ fontFamily: fonts.bodyBold, fontSize: 14, color: c.brandText }}>{label}</Text>
      <View style={{ height: 2 }} />
      <Text style={{ fontFamily: fonts.bodySemiBold, fontSize: 11, color: c.textFaint }}>{hintText}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    borderRadius: 30,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    elevation: 1,
  },
});
