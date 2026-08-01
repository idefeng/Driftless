import React, { useCallback, useRef } from 'react';
import { Pressable, Text, StyleSheet, View } from 'react-native';
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
  height = 204,
}: StepButtonProps) {
  const { c, isDark } = useTheme();
  const { t } = useI18n();
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
      style={({ pressed: isDown }) => [
        styles.btn,
        {
          flex,
          height,
          backgroundColor: c.card,
          borderColor: isDark ? 'rgba(255,154,69,0.28)' : 'rgba(244,114,22,0.18)',
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
          color: isDark ? brand.glow : brand.deep,
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
